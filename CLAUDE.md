# Project instructions

RESTful cost-manager web service. Express 5, Mongoose, Pino, plain JavaScript (ESM).

## Code style — mandatory

All JavaScript in this repository follows **"The Professional JavaScript Style Guide"
by Haim Michael**. Apply every rule below to new and edited code.

### Comments — write short ones, often

- Short `//` comments throughout, **at least one roughly every 7 lines**.
- Keep each comment to a single line. Explain *why*, never restate *what*.
- A `/* */` block goes at the top of a function, class, or module when a design
  decision, algorithm, or data structure needs explaining.
- JSDoc on every class, constructor, and function, with `@param {type} name -` and
  `@returns {type}`.
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

### Design

- Prefer pure functions; isolate the side effects.
- One responsibility per function.
- Explicit conversion at system boundaries: `Number(x)`, `String(x)`. Never `+x`.
- No global mutable state.

## API contract

Request parameter names, stored document properties, and response body properties
must be **one identical set of names**. So the cost model deliberately avoids
`timestamps` and avoids any `toJSON` transform renaming `_id` to `id` — what is
stored is exactly what is returned.

## Architecture

`route → controller → service → model`. Controllers never touch Mongoose directly;
services own data access and throw `ApiError` for expected failures. Express 5
forwards rejected promises from async handlers to the error middleware, so
controllers need no `try` / `catch` of their own.
