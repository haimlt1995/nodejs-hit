# nodejs-hit

A RESTful web service built with **Express 5**, **Mongoose**, and **Pino**, in plain JavaScript (ESM).

## Requirements

- Node.js >= 20.6 (uses the native `.env` loader and `node --watch`)
- A running MongoDB instance (local `mongod`, Docker, or MongoDB Atlas)

## Getting started

```bash
npm install
cp .env.example .env
npm run dev
```

The server listens on `http://localhost:3000` and mounts the API under `/api/v1`.

## Scripts

| Script | What it does |
| --- | --- |
| `npm start` | Runs the server. |
| `npm run dev` | Runs the server with `node --watch` for auto-restart on file changes. |
| `npm test` | Runs the built-in Node test runner (`node --test`). |

## Configuration

All settings come from environment variables, read once in [`src/config/env.js`](src/config/env.js). A `.env` file at the project root is loaded automatically if present; otherwise the ambient environment is used.

| Variable | Default | Notes |
| --- | --- | --- |
| `NODE_ENV` | `development` | `production` switches Pino to JSON output and hides 500 details. |
| `PORT` | `3000` | HTTP port. |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/nodejs-hit` | Required when `NODE_ENV=production`. |
| `LOG_LEVEL` | `debug` (`info` in production) | Pino level. |

## API

Base path: `/api/v1`

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Liveness plus MongoDB connection state. `503` when the database is down. |
| `GET` | `/items` | List items. Query: `page`, `limit` (max 100), `search` (case-insensitive name match). |
| `POST` | `/items` | Create an item. Responds `201` with a `Location` header. |
| `GET` | `/items/:id` | Fetch one item. |
| `PUT` / `PATCH` | `/items/:id` | Update an item. |
| `DELETE` | `/items/:id` | Delete an item. Responds `204`. |

`items` is an example resource that demonstrates the model → service → controller → route layering. Replace or extend it with the real domain.

### Example

```bash
curl -X POST http://localhost:3000/api/v1/items \
  -H 'Content-Type: application/json' \
  -d '{"name":"Widget","quantity":5,"tags":["demo"]}'
```

### Error format

Every failure returns the same envelope:

```json
{
  "error": {
    "status": 400,
    "message": "Validation failed",
    "details": [{ "field": "name", "message": "Path `name` is required." }]
  }
}
```

Mongoose `ValidationError` and `CastError` map to `400`, duplicate-key errors to `409`, and unknown routes to `404`. Unhandled errors return `500` with the message suppressed in production.

## Project structure

```
src/
├─ server.js              # Entry point: connect DB, listen, graceful shutdown
├─ app.js                 # Express app assembly (middleware order lives here)
├─ config/
│  ├─ env.js              # Environment parsing and validation
│  └─ db.js               # Mongoose connection lifecycle
├─ lib/
│  ├─ logger.js           # Pino instance
│  └─ ApiError.js         # HTTP-aware error type
├─ middleware/
│  ├─ notFound.js         # Unmatched-route handler
│  └─ errorHandler.js     # Terminal error middleware
├─ models/                # Mongoose schemas
├─ services/              # Business logic and data access
├─ controllers/           # HTTP request/response handling
└─ routes/                # Route tables
```

Controllers stay thin and never touch Mongoose directly; services own the data access and throw `ApiError` for expected failures. Express 5 forwards rejected promises from async handlers to the error middleware automatically, so no `try/catch` wrapper is needed in controllers.
