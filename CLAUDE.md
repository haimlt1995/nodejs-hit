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
- `costs` documents: `_id`, `description`, `category`, `userid` (Number), `sum`
  (Number), `date`.
- Cost categories are spelled `food`, `health`, `housing`, **`sports`**,
  `education` — `sports` is plural, matching the `reports` collection.
- A `reports` collection already exists, holding pre-computed monthly reports
  shaped `{ userid, year, month, costs: [{ food: [...] }, ...] }`.

## API contract

Request parameter names, stored document properties, and response body properties
must be **one identical set of names**. So the cost model deliberately avoids
`timestamps` and avoids any `toJSON` transform renaming `_id` to `id` — what is
stored is exactly what is returned.

`POST /api/add` serves **both** resources, because the brief gives them the same
path. `add.controller.js` picks by body shape: user fields are `id`, `first_name`,
`last_name`, `birthday`; cost fields are `description`, `category`, `userid`, `sum`.
The sets must stay disjoint — if a future field appears in both, the dispatch
breaks. A body matching both or neither is a `400`.

## Architecture

`route → controller → service → model`. Controllers never touch Mongoose directly;
services own data access and throw `ApiError` for expected failures. Express 5
forwards rejected promises from async handlers to the error middleware, so
controllers need no `try` / `catch` of their own.
