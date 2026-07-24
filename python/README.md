# Python Service

Minimal FastAPI service with a `GET /` endpoint.

```bash
python -m pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The service listens on `http://localhost:8000`.

```json
{ "message": "Hello from the Python service!" }
```
