package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	amqp "github.com/rabbitmq/amqp091-go"
)

const (
	exchange = "demo.events"
	queue    = "go.demo-scoring"
)

type workflowEvent struct {
	ID            string          `json:"id"`
	Type          string          `json:"type"`
	OccurredAt    string          `json:"occurredAt"`
	CorrelationID string          `json:"correlationId"`
	Producer      string          `json:"producer"`
	Data          workflowData    `json:"data"`
}

type workflowData struct {
	RequestID  string         `json:"requestId"`
	Subject    string         `json:"subject"`
	Enrichment map[string]any `json:"enrichment"`
	Score      map[string]any `json:"score,omitempty"`
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	cleanup, err := initTracer(context.Background())
	if err != nil {
		log.Printf("Warning: unable to init OTel tracer: %v", err)
	} else {
		defer cleanup()
	}

	if err := startWorkflowConsumer(); err != nil {
		log.Fatal("Unable to start Go workflow consumer: ", err)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /", helloWorld)

	address := ":" + port
	log.Printf("Go service listening on http://localhost%s", address)
	log.Fatal(http.ListenAndServe(address, mux))
}

func startWorkflowConsumer() error {
	context := context.Background()
	databaseURL := os.Getenv("DATABASE_URL")
	database, err := pgxpool.New(context, databaseURL)
	if err != nil {
		return err
	}

	_, err = database.Exec(context, `
		CREATE TABLE IF NOT EXISTS go_scores (
			request_id UUID PRIMARY KEY,
			score JSONB NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
		)
	`)
	if err != nil {
		return err
	}

	rabbitmqURL := os.Getenv("RABBITMQ_URL")
	if rabbitmqURL == "" {
		rabbitmqURL = "amqp://app:app@rabbitmq:5672"
	}
	connection, err := amqp.Dial(rabbitmqURL)
	if err != nil {
		return err
	}
	channel, err := connection.Channel()
	if err != nil {
		return err
	}

	if err = channel.ExchangeDeclare(exchange, "topic", true, false, false, false, nil); err != nil {
		return err
	}
	if _, err = channel.QueueDeclare(queue, true, false, false, false, nil); err != nil {
		return err
	}
	if err = channel.QueueBind(queue, "demo.request-enriched", exchange, false, nil); err != nil {
		return err
	}

	messages, err := channel.Consume(queue, "", false, false, false, false, nil)
	if err != nil {
		return err
	}

	go func() {
		for message := range messages {
			if err := scoreAndPublish(context, database, channel, message); err != nil {
				log.Printf("Unable to score demo request: %v", err)
				message.Nack(false, true)
				continue
			}
			message.Ack(false)
		}
	}()

	log.Println("Go workflow consumer is ready.")
	return nil
}

func scoreAndPublish(context context.Context, database *pgxpool.Pool, channel *amqp.Channel, message amqp.Delivery) error {
	var event workflowEvent
	if err := json.Unmarshal(message.Body, &event); err != nil {
		return err
	}

	value := (len(event.Data.Subject)*17 + len(event.Data.Enrichment)*13) % 100
	band := "low"
	if value >= 70 {
		band = "high"
	} else if value >= 40 {
		band = "medium"
	}
	score := map[string]any{
		"value":    value,
		"band":     band,
		"scoredBy": "go",
	}
	scoreJSON, err := json.Marshal(score)
	if err != nil {
		return err
	}

	result, err := database.Exec(context, `
		INSERT INTO go_scores (request_id, score)
		VALUES ($1, $2::jsonb)
		ON CONFLICT (request_id) DO NOTHING
	`, event.Data.RequestID, string(scoreJSON))
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return nil
	}

	event.ID = time.Now().UTC().Format("20060102T150405.000000000")
	event.Type = "demo.request-scored"
	event.OccurredAt = time.Now().UTC().Format(time.RFC3339Nano)
	event.CorrelationID = event.Data.RequestID
	event.Producer = "go"
	event.Data.Score = score
	body, err := json.Marshal(event)
	if err != nil {
		return err
	}

	return channel.PublishWithContext(context, exchange, event.Type, false, false, amqp.Publishing{
		ContentType:   "application/json",
		DeliveryMode:  amqp.Persistent,
		MessageId:     event.ID,
		CorrelationId: event.CorrelationID,
		Body:          body,
	})
}

func helloWorld(writer http.ResponseWriter, _ *http.Request) {
	writer.Header().Set("Content-Type", "application/json")
	json.NewEncoder(writer).Encode(map[string]string{
		"message": "Hello from the Go service!",
	})
}
