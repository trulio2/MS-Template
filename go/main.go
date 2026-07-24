package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /", helloWorld)

	address := ":" + port
	log.Printf("Go service listening on http://localhost%s", address)
	log.Fatal(http.ListenAndServe(address, mux))
}

func helloWorld(writer http.ResponseWriter, _ *http.Request) {
	writer.Header().Set("Content-Type", "application/json")
	json.NewEncoder(writer).Encode(map[string]string{
		"message": "Hello from the Go service!",
	})
}
