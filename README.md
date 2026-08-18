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

That starts all four services, each as its own process: logs on 3001, users on 3002, costs on 3003, about on 3004. Each mounts its API under `/api`. Run one on its own with `npm run start:users`, and so on.

> **Note on `MONGODB_URI`:** if the connection string includes a database name in the path, the driver also uses that database to authenticate. When the user is defined in `admin` (the usual case for a `root` user), append `authSource=admin` or authentication will fail.

## Scripts

| Script | What it does |
| --- | --- |
| `npm start` | Runs all four services locally, each as its own process. |
| `npm run start:logs` | Logs service only, port 3001. |
| `npm run start:users` | Users service only, port 3002. |
| `npm run start:costs` | Costs service only, port 3003. |
| `npm run start:about` | About service only, port 3004. |
| `npm test` | Runs the built-in Node test runner (`node --test`). |

## Configuration

All settings are read once, in [`shared/config/env.js`](shared/config/env.js). A `.env` file at the project root loads automatically if present; otherwise the ambient environment is used.

| Variable | Default | Notes |
| --- | --- | --- |
| `NODE_ENV` | `development` | `production` switches Pino to JSON and hides 500 details. |
| `PORT` | per service (3001-3004) | Overrides the port that service listens on. |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/nodejs-hit` | Required when `NODE_ENV=production`. |
| `LOG_LEVEL` | `debug` (`info` in production) | Pino level. |

## API

Base path: `/api`

| Service | Method | Path | Description |
| --- | --- | --- | --- |
| all | `GET` | `/health` | Liveness plus MongoDB state. `503` when the database is down. |
| logs | `GET` | `/logs` | Every stored log entry, newest first. |
| about | `GET` | `/about` | The team behind the project. |
| users | `GET` | `/users` | Every user, as stored. |
| users | `GET` | `/users/:id` | A user with the total of all their costs. |
| users | `POST` | `/add` | Adds a user. |
| costs | `POST` | `/add` | Adds a cost item. |
| costs | `GET` | `/report` | Monthly report, grouped by category. |

### `POST /api/add`

Both the users service and the costs service expose this path. They are separate
processes at separate URLs, so there is no ambiguity about which resource is meant:

| Service | Port | Body | Creates |
| --- | --- | --- | --- |
| users | 3002 | `id`, `first_name`, `last_name`, `birthday` | a user |
| costs | 3003 | `description`, `category`, `userid`, `sum` | a cost item |

In both cases the request parameters, the stored document properties, and the response properties are the same set of names.

#### Adding a user

```bash
curl -X POST http://localhost:3002/api/add \
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
| `category` | string | yes | One of `food`, `education`, `health`, `housing`, `Sport`. `sports` is accepted and stored as `Sport`. |
| `userid` | number | yes | |
| `sum` | double | yes | Stored as a BSON double. |
| `date` | date | no | Defaults to the time the request was received. Cannot fall in a month that has already closed. |

```bash
curl -X POST http://localhost:3003/api/add \
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

### `GET /api/about`

Returns a JSON array holding one entry per team member.

```json
[
  { "first_name": "Tamir", "last_name": "Shevchenko" },
  { "first_name": "Haim", "last_name": "Lev Tov" }
]
```

The entries live in [`shared/config/team.js`](shared/config/team.js) — edit that one file.

### Test script URLs

The grading script assigns four base URLs, one per process:

```python
a = "http://your-host:3001"   # logs
b = "http://your-host:3002"   # users
c = "http://your-host:3003"   # costs
d = "http://your-host:3004"   # about
```

Every path also works with a trailing slash (`/api/add/`, `/api/report/?...`), since
strict routing is left off.

### `GET /api/users`

Returns every user as an array, sorted by `id`. The properties are exactly those stored in the `users` collection, `_id` included — nothing is renamed or dropped.

```bash
curl http://localhost:3002/api/users
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
curl http://localhost:3002/api/users/123123
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

The brief requires four separate processes. Each folder under `microservices/` is one:

```
models/                    # mongoose schemas only (required folder)
shared/
  config/                  # env, db connection, team details
  lib/                     # logger, ApiError, pickFields, mongo log stream, sequences
  middleware/              # notFound, errorHandler
  services/                # business logic and data access
  createService.js         # builds and starts a service from its routers
microservices/
  logs/    index.js        # port 3001
  users/   index.js        # port 3002
  costs/   index.js        # port 3003
  about/   index.js        # port 3004
scripts/start-all.js       # runs all four locally, one child process each
```

`POST /api/add` exists on both the users and the costs service. They are separate
processes at separate URLs, so the path does not clash — the users service adds a
user, the costs service adds a cost.

Within a service: `route → controller → service → model`. Controllers stay thin and
never touch Mongoose directly; services own data access and throw `ApiError` for
expected failures. Express 5 forwards rejected promises from async handlers to the
error middleware, so controllers need no `try`/`catch`.

## Deployment

Each service runs as its own process. On one server give each a different port; on
separate servers they may all use the same one. The Dockerfile builds any of them:

```bash
docker build --build-arg SERVICE=users -t nodejs-hit-users .
```

## Code style

All JavaScript here follows *The Professional JavaScript Style Guide* by Haim Michael. The rules are written out in [CLAUDE.md](CLAUDE.md).
