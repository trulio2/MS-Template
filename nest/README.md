# NestJS Service

NestJS reference service with the existing authentication and static-content modules.

```bash
npm install
npm run start:dev
```

The service listens on `http://localhost:3000` by default. Set `PORT` to use a different port.

Current routes include:

| Method | Path                  | Purpose                                 |
| ------ | --------------------- | --------------------------------------- |
| `GET`  | `/auth/me`            | Return the currently authenticated user |
| `GET`  | `/static/movies.html` | Serve the static movies page            |

Unlike the other starter services, this existing NestJS application does not currently expose a `GET /` hello-world route.
