# Cost Manager — RESTful Web Services

A cost-manager REST API built as **five independent processes**, in plain JavaScript (ESM)
with **Express 5**, **Mongoose** and **Pino**.

Users keep a list of cost items, each belonging to a category, and can ask for a monthly
report grouped by those categories. Every request the services receive is written to the
database as a log entry.

---

## Live services

Each service is deployed on its own host and listens on port `3000`. Four of them are the
processes the project requires; `general` is an extra that answers everything at once.

| Service | Handles | URL |
| --- | --- | --- |
| **logs** | `GET /api/logs` | https://serversidenode-m3.tamirserver.com |
| **users** | `GET /api/users`, `GET /api/users/:id`, `POST /api/add` | https://serversidenode-m1.tamirserver.com |
| **costs** | `POST /api/add`, `GET /api/report` | https://serversidenode-m2.tamirserver.com |
| **about** | `GET /api/about` | https://serversidenode-m4.tamirserver.com |
| **general** | everything above, in one process | https://serversidenode.tamirserver.com |

Try one:

```bash
curl https://serversidenode-m4.tamirserver.com/api/about
curl "https://serversidenode-m2.tamirserver.com/api/report?id=123123&year=2026&month=1"
```

### Base URLs for the course test script

The grading script takes four base URLs, one per process:

```python
a = "https://serversidenode-m3.tamirserver.com"   # logs
b = "https://serversidenode-m1.tamirserver.com"   # users
c = "https://serversidenode-m2.tamirserver.com"   # costs
d = "https://serversidenode-m4.tamirserver.com"   # about
```

Pointing all four at the general service works too, since it answers every endpoint:

```python
a = b = c = d = "https://serversidenode.tamirserver.com"
```

Every path also accepts a trailing slash (`/api/add/`, `/api/report/?...`), which is how
the test script writes them.

---

## Architecture

The brief asks for four separate processes rather than one application with four routers.
Each folder under `microservices/` is a complete, self-contained project: its own
`package.json`, its own dependencies, its own entry point.

```
microservices/
  logs/       GET /api/logs
  users/      GET /api/users, GET /api/users/:id, POST /api/add
  costs/      POST /api/add, GET /api/report
  about/      GET /api/about
  general/    all of the above, in one process
scripts/
  start-all.js        runs the four locally, one child process each
  reset-database.js   empties the database for submission
tests/                one file per service
```

Every service folder has the same shape:

```
microservices/users/
  package.json        its own dependencies and start script
  .env.example        copy to .env and fill in
  index.js            entry point: opens the database, then listens
  createService.js    builds the app from the routers it owns
  *.routes.js         the paths this service answers
  *.controller.js     request in, response out
  config/             env parsing, database connection, team details
  lib/                logger, ApiError, pickFields, mongo log stream, id sequences
  middleware/         notFound, errorHandler
  models/             mongoose schemas only (folder required by the brief)
  services/           business logic and data access
```

**No file imports across service folders.** A folder can be copied out on its own,
installed and started, which is exactly how each one is deployed. The trade-off is
deliberate: the plumbing every service needs — logger, error handler, models — exists as a
copy in each folder, so a fix has to be repeated in every folder that carries it.

Inside a service the flow is `route → controller → service → model`. Controllers stay thin
and never touch Mongoose directly; services own data access and throw `ApiError` for
expected failures. Express 5 forwards a rejected promise from an async handler to the
error middleware, so controllers need no `try`/`catch`.

### Why `POST /api/add` appears twice

The brief gives one path to two different resources. The users service and the costs
service are separate processes at separate URLs, so there is no clash — the URL already
says which is meant, and neither inspects the body to guess.

The general service is the one place both live together, so there the body decides. The
two field sets share no names, so the choice is never ambiguous:

| Body carries | Creates |
| --- | --- |
| `id`, `first_name`, `last_name`, `birthday` | a user |
| `description`, `category`, `userid`, `sum` | a cost item |

A body mixing the two, or matching neither, is rejected with `400` rather than guessed at.

---

## The Computed design pattern

Grouping a month of costs is read-heavy work whose answer stops changing once the month is
over. So a finished month is worked out once, stored in the `reports` collection, and read
back from there afterwards.

- A month that has **ended** is computed on first request, saved, and served from the
  saved copy every time after.
- The **current** month and any month **ahead** are always computed fresh, because a new
  cost can still land in them, so nothing is saved.
- A cost item may not be dated inside a month that has already closed. That is what keeps
  a stored report from ever going stale.

The report reply carries exactly `userid`, `year`, `month` and `costs`.

---

## Data model

| Collection | Holds |
| --- | --- |
| `users` | `id` (Number, the business id, distinct from `_id`), `first_name`, `last_name`, `birthday` |
| `costs` | `description`, `category`, `userid` (Number), `sum` (Double), `date` |
| `logs` | `level`, `message`, `method`, `endpoint`, `statusCode`, `timestamp` |
| `reports` | `userid`, `year`, `month`, `costs` — the Computed pattern's cache |
| `counters` | one document per collection, backing the auto-incrementing `id` |

`id` and `_id` are two different things and are never mixed. Request parameters, stored
document properties and response properties are one identical set of names, so the schemas
avoid `timestamps` and avoid any `toJSON` transform that would rename `_id`.

Cost categories are `food`, `education`, `health`, `housing` and `sports`, in that order.
`Sport` and `sport` are accepted on input and stored as `sports`.

---

## Running it locally

Requires Node.js >= 20.6 (for the native `.env` loader and `node --watch`) and a reachable
MongoDB.

Everything at once, from the project root:

```bash
npm install
cp .env.example .env     # then fill in the database settings
npm run dev
```

One service the way it is deployed, from its own folder:

```bash
cd microservices/users
npm install
cp .env.example .env
npm start
```

Every service listens on `PORT` from its env file, which is `3000`, because each is meant
to sit on a server of its own. One machine cannot give all four the same port, so
`npm run dev` hands a different one to each: logs `3001`, users `3002`, costs `3003`,
about `3004`.

### Scripts

| Script | What it does |
| --- | --- |
| `npm start` | Runs the four services locally, each its own process, on ports 3001-3004. |
| `npm run dev` | The same, restarting on a file change. |
| `npm run start:logs` | Logs service only. |
| `npm run start:users` | Users service only. |
| `npm run start:costs` | Costs service only. |
| `npm run start:about` | About service only. |
| `npm run start:general` | Every endpoint in one process. |
| `npm test` | Runs the endpoint tests. |
| `npm run reset-db -- --confirm` | Empties the database, leaving the one imaginary user. |

---

## Configuration

Settings are read once, in each service's `config/env.js`, from two env files. Neither is
required.

| File | Holds |
| --- | --- |
| `microservices/<service>/.env` | everything that service needs, port and database |
| `.env` (project root) | the same settings, shared by all of them while developing |

Whatever is set **first** wins: a service's own file beats the root file, and a real
environment variable beats them both. That last part is what lets `npm run dev` put the
four on different ports without editing any file.

A deployed service is on its own, so its own `.env` has to carry the database as well as
the port.

| Variable | Default | Notes |
| --- | --- | --- |
| `MONGODB_URI` | — | The Atlas connection string. Required; a service refuses to start without it. |
| `PORT` | `3000` | The port this service listens on. |
| `NODE_ENV` | `development` | `production` switches Pino to JSON and hides `500` details. |
| `LOG_LEVEL` | `debug` (`info` in production) | Pino level. Silencing it also stops log entries being stored. |

> Name the database in the path, before the `?`:
> `mongodb+srv://user:pass@cluster.mongodb.net/store?retryWrites=true&w=majority`.
> Atlas copies the string without one, and the driver then quietly uses `test`.

No credentials live in this repository. `.env` is git-ignored; `.env.example` shows the
shape with the values left blank.

---

## API

Base path: `/api`. Every service also answers `GET /api/health`, which reports its own name
and whether the database is connected (`503` when it is not).

### `GET /api/about`

One entry per team member, and nothing else.

```json
[
  { "first_name": "Tamir", "last_name": "Shevchenko" },
  { "first_name": "Haim", "last_name": "Lev Tov" }
]
```

The names are hardcoded in `config/team.js`, not stored in the database, since the database
ships holding a single imaginary user.

### `GET /api/users`

Every user, sorted by `id`, with exactly the properties the collection stores — `_id`
included, nothing renamed or dropped.

```json
[
  {
    "_id": "...",
    "id": 111111,
    "first_name": "dana",
    "last_name": "cohen",
    "birthday": "1995-05-12T00:00:00.000Z"
  }
]
```

### `GET /api/users/:id`

One user together with the sum of all their costs. The `id` in the path is the business id,
not Mongo's `_id`. Mongo does the summing, so the cost documents never travel over the wire.

```json
{ "first_name": "mosh", "last_name": "israeli", "id": 123123, "total": 267.5 }
```

Exactly these four properties are returned — `birthday` and `_id` are not exposed. A user
with no costs gets `"total": 0`. An unknown id gives `404`; an id that is not a whole
number gives `400`.

### `POST /api/add` — adding a user

| Parameter | Type | Required |
| --- | --- | --- |
| `id` | number | yes |
| `first_name` | string | yes |
| `last_name` | string | yes |
| `birthday` | date | yes |

```bash
curl -X POST https://serversidenode-m1.tamirserver.com/api/add \
  -H 'Content-Type: application/json' \
  -d '{"id":987654,"first_name":"test","last_name":"person","birthday":"1999-03-04"}'
```

Responds `201` with the stored document. `id` must be unique — a repeat gives `409`:

```json
{ "id": 409, "message": "User 987654 already exists" }
```

Uniqueness is enforced twice: the service checks before inserting, to give that clear
message, and a unique index guards against two requests racing.

### `POST /api/add` — adding a cost item

| Parameter | Type | Required | Notes |
| --- | --- | --- | --- |
| `description` | string | yes | |
| `category` | string | yes | One of `food`, `education`, `health`, `housing`, `sports`. `Sport` and `sport` are accepted and stored as `sports`. |
| `userid` | number | yes | Must be a user that exists. |
| `sum` | double | yes | Stored as a BSON double. |
| `date` | date | no | Defaults to when the request arrived. Cannot fall in a month that has already closed. |

```bash
curl -X POST https://serversidenode-m2.tamirserver.com/api/add \
  -H 'Content-Type: application/json' \
  -d '{"description":"chicken breast","category":"food","userid":123123,"sum":42.5}'
```

Responds `201` with the stored document. Any property that is not one of the five above is
ignored, so a client cannot set `_id` or write arbitrary fields.

### `GET /api/report`

Query: `id`, `year`, `month`. Every category appears, in a fixed order, and one with no
costs is still listed as an empty array. Each cost is given as `sum`, `description` and
`day`.

```bash
curl "https://serversidenode-m2.tamirserver.com/api/report?id=123123&year=2026&month=1"
```

```json
{
  "userid": 123123,
  "year": 2026,
  "month": 1,
  "costs": [
    { "food": [{ "sum": 12, "description": "choco", "day": 17 }] },
    { "education": [] },
    { "health": [] },
    { "housing": [] },
    { "sports": [] }
  ]
}
```

### `GET /api/logs`

Every stored log entry, newest first, with the property names the collection uses. A log
line is written for each request a service receives, and again whenever an endpoint is
reached.

### Error format

Every failure returns one flat JSON document carrying `id` and `message` at the top level.
`id` is the HTTP status code. `details` is added when specific fields are at fault.

```json
{
  "id": 400,
  "message": "Validation failed",
  "details": [{ "field": "category", "message": "`wine` is not a valid enum value for path `category`." }]
}
```

A missing or invalid parameter gives `400`, a duplicate gives `409`, an unknown route gives
`404`, and anything unexpected gives `500` with the message suppressed in production.

---

## Tests

```bash
npm test
```

One file per service in `tests/`, on the test runner built into Node — no test library to
install. A file starts the **real `index.js`** of its service, exactly as it is deployed,
and talks to it over HTTP, so routing, validation, the error format and the database are
exercised together rather than in isolation.

Each file works in a database of its own, `store_test_<service>`, which it seeds and drops
again at the end. **The application's own database is never touched**, and the files can
run at the same time without wiping each other's rows.

Between them the tests cover every endpoint: reply shapes and the exact property names the
contract fixes, all five categories in the required order, an empty category still
appearing, one user's costs staying out of another's report, the Computed pattern saving a
closed month and reading it back while never saving the current one, a cost refused for a
user that does not exist, a duplicate user giving `409`, the trailing slashes the test
script sends, `id` and `message` on every failure, and each service answering `404` for the
endpoints it does not own.

The tests read `MONGODB_URI` from the same `.env` as everything else, and give each
service its own `store_test_<service>` database on that cluster, so a run never touches
real data.

---

## Deployment

Each service is deployed from its own folder, as its own process, on its own host. Because
a folder is self-contained, a host can build it straight from that directory — set the base
directory to `microservices/<service>`, and give it an `.env` carrying `PORT` and the
`DB_*` settings.

The Dockerfile builds any one of them:

```bash
docker build --build-arg SERVICE=users -t nodejs-hit-users .
```

---

## Before submitting

The database has to arrive empty apart from a single imaginary user:

```bash
npm run reset-db -- --confirm
```

Run it **last**. Every service writes a log line for each request it receives, as the brief
requires, so a deployed service that anyone touches — a health check is enough — starts
filling the logs collection again straight away.

---

## Code style

All JavaScript here follows *The Professional JavaScript Style Guide* by Haim Michael. The
rules the project holds itself to are written out in [CLAUDE.md](CLAUDE.md).
