# nodejs-hit

A RESTful cost-manager web service built with **Express 5**, **Mongoose**, and **Pino**, in plain JavaScript (ESM).

## Requirements

- Node.js >= 20.6 (uses the native `.env` loader and `node --watch`)
- A MongoDB instance (local `mongod`, Docker, or a remote server)

## Getting started

```bash
npm install
```

Copy `.env.example` to `.env` and set `MONGODB_URI`, then:

```bash
npm run dev
```

The server listens on `http://localhost:3000` and mounts the API under `/api`.

> **Note on `MONGODB_URI`:** if the connection string includes a database name in the path, the driver also uses that database to authenticate. When the user is defined in `admin` (the usual case for a `root` user), append `authSource=admin` or authentication will fail.

## Scripts

| Script | What it does |
| --- | --- |
| `npm start` | Runs the server. |
| `npm run dev` | Runs the server with `node --watch` for auto-restart on file changes. |
| `npm test` | Runs the built-in Node test runner (`node --test`). |

## Configuration

All settings are read once, in [`src/config/env.js`](src/config/env.js). A `.env` file at the project root loads automatically if present; otherwise the ambient environment is used.

| Variable | Default | Notes |
| --- | --- | --- |
| `NODE_ENV` | `development` | `production` switches Pino to JSON and hides 500 details. |
| `PORT` | `3000` | HTTP port. |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/nodejs-hit` | Required when `NODE_ENV=production`. |
| `LOG_LEVEL` | `debug` (`info` in production) | Pino level. |

## API

Base path: `/api`

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Liveness plus MongoDB connection state. `503` when the database is down. |
| `POST` | `/add` | Adds a new cost item, or a new user. The body decides which. |
| `GET` | `/users` | Returns every user, as stored. |
| `GET` | `/users/:id` | Returns a user with the total of all their costs. |

### `POST /api/add`

The brief gives this one path to both resources, so the body decides which is meant. The two field sets share no names:

| Body carries | Creates | Collection |
| --- | --- | --- |
| `description`, `category`, `userid`, `sum` | a cost item | `costs` |
| `id`, `first_name`, `last_name`, `birthday` | a user | `users` |

A body carrying fields from both, or from neither, is rejected with `400` rather than guessed at. In both cases the request parameters, the stored document properties, and the response properties are the same set of names.

#### Adding a user

```bash
curl -X POST http://localhost:3000/api/add \
  -H 'Content-Type: application/json' \
  -d '{"id":987654,"first_name":"test","last_name":"person","birthday":"1999-03-04"}'
```

Responds `201` with the stored document. All four parameters are required. `id` must be unique — adding a user whose `id` already exists gives `409`:

```json
{ "id": 409, "message": "User 987654 already exists" }
```

Uniqueness is enforced twice: the service checks before inserting, to give that clear message, and a unique index on `users.id` guards against two requests racing.

#### Adding a cost item

Adds one document to the `costs` collection.

| Parameter | Type | Required | Notes |
| --- | --- | --- | --- |
| `description` | string | yes | |
| `category` | string | yes | One of `food`, `health`, `housing`, `sports`, `education`. |
| `userid` | number | yes | |
| `sum` | number | yes | |
| `date` | date | no | Defaults to the time the request was received. |

```bash
curl -X POST http://localhost:3000/api/add \
  -H 'Content-Type: application/json' \
  -d '{"description":"chicken breast","category":"food","userid":123123,"sum":42.5}'
```

Responds `201 Created` with the stored document:

```json
{
  "description": "chicken breast",
  "category": "food",
  "userid": 123123,
  "sum": 42.5,
  "_id": "6a82e46827d48c8f4eaf3701",
  "date": "2026-08-17T10:37:28.271Z"
}
```

Any property in the body that is not one of the five above is ignored, so a client cannot set `_id` or write arbitrary fields.

### `GET /api/users`

Returns every user as an array, sorted by `id`. The properties are exactly those stored in the `users` collection, `_id` included — nothing is renamed or dropped.

```bash
curl http://localhost:3000/api/users
```

```json
[
  {
    "_id": "6a82e2d83c64b770800e48d0",
    "id": 111111,
    "first_name": "dana",
    "last_name": "cohen",
    "birthday": "1995-05-12T00:00:00.000Z"
  }
]
```

Note the contrast with `/api/users/:id` below: that endpoint projects four named properties, because its contract names them. This one mirrors the collection instead.

### `GET /api/users/:id`

Returns one user together with the sum of all their costs. The `id` in the path is the user's business id (the `id` property in the `users` collection), not Mongo's `_id`.

```bash
curl http://localhost:3000/api/users/123123
```

```json
{
  "first_name": "mosh",
  "last_name": "israeli",
  "id": 123123,
  "total": 267.5
}
```

Exactly these four properties are returned — `birthday` and `_id` are not exposed. A user with no costs gets `"total": 0`. An unknown id gives `404`, and an id that is not a whole number gives `400`.

### Error format

Every failure returns the same JSON document, carrying `id` and `message` at the top level. `id` is the HTTP status code. `details` is added when the failure can be attributed to specific fields:

```json
{
  "id": 400,
  "message": "Validation failed",
  "details": [{ "field": "category", "message": "`wine` is not a valid enum value for path `category`." }]
}
```

A missing or invalid parameter gives `400` naming each offending field, a duplicate key gives `409`, and an unknown route gives `404`. Unexpected failures give `500`, with the message suppressed in production.

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

`route → controller → service → model`. Controllers stay thin and never touch Mongoose directly; services own data access and throw `ApiError` for expected failures. Express 5 forwards rejected promises from async handlers to the error middleware automatically, so controllers need no `try`/`catch`.

## Code style

All JavaScript here follows *The Professional JavaScript Style Guide* by Haim Michael. The rules are written out in [CLAUDE.md](CLAUDE.md).
