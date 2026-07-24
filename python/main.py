from fastapi import FastAPI

app = FastAPI(title="Python Service")


@app.get("/")
def hello_world() -> dict[str, str]:
    return {"message": "Hello from the Python service!"}
