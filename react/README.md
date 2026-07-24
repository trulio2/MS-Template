# React Showcase

The React showcase is the browser-facing test dashboard for the microservice template. It calls each service through the Nginx gateway using same-origin `/api/...` routes.

Use the **Start workflow** panel to create a demo request. The page polls NestJS for the timeline as Python enriches the request, Go scores it, and Node.js records the completion notification through RabbitMQ.

## Build for Nginx

Nginx serves this project's `dist/` directory at `http://localhost:8080/`.

```bash
yarn install
yarn build
```

Start the full stack from the repository root after building:

```bash
docker compose up --build
```

## Local development

With the Compose stack running, start Vite locally:

```bash
yarn dev
```

Vite proxies `/api` requests to `http://localhost:8080`, so the dashboard continues to exercise the same Nginx routes as the production build.

## Gateway routes

| Service | Route          |
| ------- | -------------- |
| NestJS  | `/api/nest/`   |
| Node.js | `/api/node/`   |
| FastAPI | `/api/python/` |
| Go      | `/api/go/`     |
