import json
import os
import threading
import uuid
from datetime import datetime, timezone

import pika
import psycopg
from fastapi import FastAPI

app = FastAPI(title="Python Service")

from otel import init_telemetry
init_telemetry(app)

DATABASE_URL = os.getenv("DATABASE_URL", "")
RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://app:app@rabbitmq:5672")
EXCHANGE = "demo.events"
QUEUE = "python.demo-enrichment"


def ensure_table() -> None:
    with psycopg.connect(DATABASE_URL, autocommit=True) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS python_enrichments (
              request_id UUID PRIMARY KEY,
              enrichment JSONB NOT NULL,
              created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )


def enrich(event: dict) -> dict:
    request_id = event["data"]["requestId"]
    subject = event["data"]["subject"]
    words = subject.split()
    enrichment = {
        "category": "priority" if len(words) > 3 else "standard",
        "normalizedSubject": subject.strip().lower(),
        "wordCount": len(words),
        "enrichedBy": "python",
    }

    with psycopg.connect(DATABASE_URL, autocommit=True) as connection:
        cursor = connection.execute(
            """
            INSERT INTO python_enrichments (request_id, enrichment)
            VALUES (%s, %s::jsonb)
            ON CONFLICT (request_id) DO NOTHING
            RETURNING request_id
            """,
            (request_id, json.dumps(enrichment)),
        )
        inserted = cursor.fetchone()

    return {"requestId": request_id, "subject": subject, "enrichment": enrichment, "inserted": bool(inserted)}


def consume_demo_requests() -> None:
    parameters = pika.URLParameters(RABBITMQ_URL)
    connection = pika.BlockingConnection(parameters)
    channel = connection.channel()
    channel.exchange_declare(exchange=EXCHANGE, exchange_type="topic", durable=True)
    channel.queue_declare(queue=QUEUE, durable=True)
    channel.queue_bind(exchange=EXCHANGE, queue=QUEUE, routing_key="demo.request-created")

    def handle_message(channel, method, _properties, body) -> None:
        try:
            event = json.loads(body)
            result = enrich(event)

            if result.pop("inserted"):
                enriched_event = {
                    "id": str(uuid.uuid4()),
                    "type": "demo.request-enriched",
                    "occurredAt": datetime.now(timezone.utc).isoformat(),
                    "correlationId": result["requestId"],
                    "producer": "python",
                    "data": result,
                }
                channel.basic_publish(
                    exchange=EXCHANGE,
                    routing_key=enriched_event["type"],
                    body=json.dumps(enriched_event),
                    properties=pika.BasicProperties(
                        content_type="application/json",
                        delivery_mode=2,
                        message_id=enriched_event["id"],
                        correlation_id=result["requestId"],
                    ),
                )

            channel.basic_ack(delivery_tag=method.delivery_tag)
        except Exception:
            channel.basic_nack(delivery_tag=method.delivery_tag, requeue=True)

    channel.basic_consume(queue=QUEUE, on_message_callback=handle_message)
    print("Python workflow consumer is ready.")
    channel.start_consuming()


@app.on_event("startup")
def start_workflow_consumer() -> None:
    ensure_table()
    worker = threading.Thread(target=consume_demo_requests, daemon=True)
    worker.start()


@app.get("/")
def hello_world() -> dict[str, str]:
    return {"message": "Hello from the Python service!"}
