# nodejs-hit

A RESTful cost-manager web service built with **Express 5**, **Mongoose**, and **Pino**, in plain JavaScript (ESM).

## Requirements

- Node.js >= 20.6 (uses the native `.env` loader and `node --watch`)
- A MongoDB instance (local `mongod`, Docker, or a remote server)

## Getting started

To work on all of them at once, from the project root:

```bash
npm install
```

Copy `.env.example` to `.env` and fill in the database, then:

```bash
npm run dev
```

To run one service the way it is deployed, from its own folder:

```bash
cd microservices/users
npm install
cp .env.example .env
npm start
```

Every service listens on the port in its env file, which is `3000`, because each one is meant to sit on a server of its own. On one machine they cannot all have 3000, so `npm run dev` hands a different port to each: logs 3001, users 3002, costs 3003, about 3004. Run one on its own with `npm run start:users`, and it takes 3000 as usual.

Each mounts its API under `/api`.

> **Note on `MONGODB_URI`:** if the connection string includes a database name in the path, the driver also uses that database to authenticate. When the user is defined in `admin` (the usual case for a `root` user), append `authSource=admin` or authentication will fail.

## Scripts

| Script | What it does |
| --- | --- |
| `npm start` | Runs all four services locally, each as its own process, on ports 3001-3004. |
| `npm run start:logs` | Logs service only. |
| `npm run start:users` | Users service only. |
| `npm run start:costs` | Costs service only. |
| `npm run start:about` | About service only. |
| `npm run start:general` | Every endpoint in one process. |
| `npm test` | Runs the endpoint tests. |
| `npm run reset-db -- --confirm` | Empties the database, leaving the one imaginary user. |

Each `start:` script listens on `PORT` from the env file, `3000` by default.

## Tests

```bash
npm test
```

One file per service, in `tests/`, using the test runner built into Node — no test
library to install. A file starts the real `index.js` of its service, exactly as it
is deployed, and then talks to it over http, so routing, validation, the error
format and the database all get exercised together.

Each file works in a database of its own, named `store_test_<service>`, which it
creates, seeds, and drops again at the end. **The application's own database is
never touched**, so the tests are safe to run against the same server.

They need a reachable MongoDB, taken from the same `.env` as everything else. When
running from a machine that cannot resolve the internal database host, point
`DB_HOST` at the public address for the run:

```bash
DB_HOST=<public-address> npm test
```

## Before submitting

The database has to arrive empty apart from a single imaginary user:

```bash
npm run reset-db -- --confirm
```

Run it **last**. Every service writes a log line for each request it receives, as
the brief requires, so a deployed service that anyone touches — a health check is
enough — starts filling the logs collection again straight away.

## Configuration

All settings are read once, in each service's `config/env.js`, from two env files:

| File | Holds | Copy from |
| --- | --- | --- |
| `microservices/<service>/.env` | everything that service needs, port and database | its own `.env.example` |
| `.env` (project root) | the same settings, shared by all of them while developing | `.env.example` |

Whatever is set first wins, so a service's own file beats the root file, and a real
environment variable beats them both. That last part is what lets `npm run dev` put
the four on different ports without editing anything.

A deployed service is on its own, so its own `.env` has to carry the database as
well as the port. Neither file is required: with no env file at all, a service falls
back to port 3000 and a local database.

| Variable | Default | Notes |
| --- | --- | --- |
| `NODE_ENV` | `development` | `production` switches Pino to JSON and hides 500 details. |
| `PORT` | `3000` | The port a service listens on, from its own `.env`. One server each, so all five use 3000. |
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
| general | | all of the above | Every endpoint, in one process. |

### `POST /api/add`

Both the users service and the costs service expose this path. They are separate
processes at separate URLs, so there is no ambiguity about which resource is meant:

| Service | Local port | Body | Creates |
| --- | --- | --- | --- |
| users | 3002 | `id`, `first_name`, `last_name`, `birthday` | a user |
| costs | 3003 | `description`, `category`, `userid`, `sum` | a cost item |

In both cases the request parameters, the stored document properties, and the response properties are the same set of names.

The general service is the one place where both live together, so there the body
decides: a user body adds a user, a cost body adds a cost, and a body mixing the
two or matching neither is a `400` rather than a guess.

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

The entries live in `config/team.js`, inside the about service and the general one.

### Test script URLs

The grading script assigns four base URLs, one per process. Deployed, each service
sits on its own server on port 3000:

```python
a = "http://logs-host:3000"    # logs
b = "http://users-host:3000"   # users
c = "http://costs-host:3000"   # costs
d = "http://about-host:3000"   # about
```

Locally, `npm run dev` puts them on 3001-3004 instead, since one machine cannot give
all four the same port. Pointing all four at one general service also works, because
it answers every endpoint:

```python
a = b = c = d = "http://general-host:3000"
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
microservices/
  logs/                    # GET /api/logs
  users/                   # GET /api/users, /api/users/:id, POST /api/add
  costs/                   # POST /api/add, GET /api/report
  about/                   # GET /api/about
  general/                 # all of the above, in one process
scripts/start-all.js       # runs the four locally, one child process each
```

Every folder is a whole project, laid out the same way:

```
microservices/users/
  package.json             # its own dependencies and start script
  .env.example             # port and database, copy to .env
  index.js                 # entry point: opens the database, then listens
  createService.js         # builds and starts the app from its routers
  *.routes.js              # the paths this service answers
  *.controller.js          # request in, response out
  config/                  # env, db connection, team details
  lib/                     # logger, ApiError, pickFields, mongo log stream, sequences
  middleware/              # notFound, errorHandler
  models/                  # mongoose schemas only (required folder)
  services/                # business logic and data access
```

No file reaches outside its own folder, so a folder can be copied out, installed and
run on its own. That is what lets a host build one service straight from its
directory. The cost is that the parts every service needs — the logger, the error
handler, the models — exist as a copy in each one, so a fix there has to be made in
each folder that carries it.

`POST /api/add` exists on both the users and the costs service. They are separate
processes at separate URLs, so the path does not clash — the users service adds a
user, the costs service adds a cost. The general service, holding both, picks by
body shape instead.

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
