# Project instructions

RESTful cost-manager web service. Express 5, Mongoose, Pino, plain JavaScript (ESM).

## Code style — mandatory

All JavaScript in this repository follows **"The Professional JavaScript Style Guide"
by Haim Michael**. Apply every rule below to new and edited code.

### Comments — short, plain, frequent

- Short `//` comments throughout, **at least one roughly every 7 lines**.
- **Keep them terse and human — one line, ideally under ten words.** Write the way
  you'd explain it to a colleague, not the way a manual would. Say *why*, never
  restate *what*.
  - Good: `// Root users live in admin, not in the app database.`
  - Too wordy: `// The root user is defined in the admin database, so that is
    where the authentication process is going to take place.`
- A `/* */` block goes at the top of a function, class, or module when a design
  decision, algorithm, or data structure needs explaining. Two or three lines, not
  a paragraph.
- JSDoc on every class, constructor, and function, with `@param {type} name -` and
  `@returns {type}`. Keep each description to one short line.
- Never let a comment compensate for unclear code; fix the code first.

### Language rules

- `const` by default. `let` only for genuine reassignment. Never `var`.
- Strict equality `===` and `!==` only. No `==`, and no loose `!= null` checks —
  compare against `undefined` and `null` explicitly.
- Semicolons end every statement.
- Single quotes for strings. Backticks only for interpolation or multiline.
- Array literals, never the `Array` constructor.
- Arrow functions for callbacks passed as arguments.
- `async` / `await` with `try` / `catch`. Not `.then()` / `.catch()` chains.
  Callbacks are acceptable only for low-level Node APIs.
- Methods belong on the prototype; `class` syntax already does this.

### Naming

- `camelCase` for variables, functions, and properties.
- `PascalCase` for classes and constructor functions.
- `UPPER_SNAKE_CASE` for module-level constants; no unexplained magic numbers.
- Boolean names take an `is`, `has`, `can`, or `should` prefix.
- Plural names for collections.
- Avoid generic names such as `data`, `value`, `result`, `info`. Use domain words.
- **Exception:** property names fixed by the API contract or by the existing
  collections keep their given spelling — `first_name`, `last_name`, `userid`.
  Never "correct" these to camelCase.

### Design

- Prefer pure functions; isolate the side effects.
- One responsibility per function.
- Explicit conversion at system boundaries: `Number(x)`, `String(x)`. Never `+x`.
- No global mutable state.

Every error response is one flat JSON document carrying **`id` and `message`** at
the top level, per the brief's minimum. `id` is the HTTP status code. `details` is
added when specific fields are at fault. Do not nest these under an `error` key.

## Known data facts

Verified against the live `store` database:

- `users` documents: `_id`, `id` (Number, the business id), `first_name`,
  `last_name`, `birthday`. There is no `marital_status`.
- `costs` documents: `_id`, `id` (Number, auto-increment), `description`, `category`,
  `userid` (Number), `sum` (**Double** — the document says so explicitly; use
  `mongoose.Schema.Types.Double`, not `Number`, or Mongo stores whole values as int32),
  `date`.
- Cost categories, in the exact order and spelling a report must use:
  `food`, `education`, `health`, `housing`, **`Sport`**. The project document spells
  it `sports` in prose but `Sport` in every JSON sample; the schema accepts either on
  input and stores `Sport`. Do not "fix" the capital S.
- A cost may not be dated inside a month that has already closed. The document says
  so, and the Computed cache depends on it: a closed month is never rebuilt.
- The report reply carries exactly `userid`, `year`, `month`, `costs` — no `id`,
  because the document's sample has none.
- A `reports` collection holds pre-computed monthly reports shaped
  `{ userid, year, month, costs: [{ food: [...] }, ...] }`. It is a cache: safe
  to delete, since the Computed pattern rebuilds a closed month on next request.
- A cost may only reference a `userid` that exists in `users` (Q&A item 11).

## API contract

Request parameter names, stored document properties, and response body properties
must be **one identical set of names**. So the cost model deliberately avoids
`timestamps` and avoids any `toJSON` transform renaming `_id` to `id` — what is
stored is exactly what is returned.

## Architecture — four processes

The brief requires **four separate processes (microservices)**, each deployed at its
own URL. One project with four routers does **not** satisfy it. Each folder under
`microservices/` is a standalone entry point that starts its own Express server:

| Service | Default port | Endpoints |
| --- | --- | --- |
| `logs` | 3001 | `GET /api/logs` |
| `users` | 3002 | `GET /api/users`, `GET /api/users/:id`, `POST /api/add` |
| `costs` | 3003 | `POST /api/add`, `GET /api/report` |
| `about` | 3004 | `GET /api/about` |

`POST /api/add` exists on **two** services. They are separate processes at separate
URLs, so there is no clash: the users service adds a user, the costs service adds a
cost. Neither inspects the body to guess which — that dispatch was removed when the
processes split.

Layout:

- `models/` — mongoose schemas only. Required by the Q&A; keep it at the root.
- `shared/` — config, lib, middleware, services, and `createService.js`, which
  builds and starts a service given its routers. Shared so the four processes do
  not carry four copies of the same plumbing.
- `microservices/<name>/` — one `index.js` per process, plus its own controllers
  and routes.

Within a service: `route → controller → service → model`. Controllers never touch
Mongoose directly; services own data access and throw `ApiError` for expected
failures. Express 5 forwards rejected promises from async handlers to the error
middleware, so controllers need no `try` / `catch` of their own.

The costs service imports `userExists` from the users service code, because a cost
may only reference a user that exists (Q&A item 11). That is a shared library call,
not a network call between processes.
