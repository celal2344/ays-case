# API errors

How the API fails, what the client sees, and what the logs keep. Code: `apps/api/src/utils/` (`errors.ts`, `error-helpers.ts`, `db-errors.ts`, `error-log.ts`) and `apps/api/src/middlewares/error-handler.ts`. The shared code list and body schema are in `@ays/validators` (`errorCodes`, `errorSchema`).

## The shape

Every error body is `{ code, message, requestId }`. Validation errors add `errors: { field, message }[]`. `code` is one of `errorCodes` (the web maps it to translated text; `message` is an English fallback). `requestId` is also the `x-request-id` response header.

The client never receives `layer`, `op`, `meta`, SQL, or a stack. Those exist for the logs only. The one exception is development: with `NODE_ENV=development` the body also has a `debug` object (`layer`, `op`, `meta`, `cause: { name, message, pgCode? }`, `stack`), so Scalar shows the real reason locally. It is never sent in production or in tests that assert the public shape.

```json
{ "code": "not_found", "message": "Product not found", "requestId": "…" }
```

## How to throw

Only repositories and services throw. Route handlers do not catch, and services never return error bodies. Use the scoped helpers:

```ts
const fail = errorsFor('catalog', 'repository') // scope + layer

throw fail.notFound('findProductDetail', 'Product not found', { id }) // op: catalog.repository.findProductDetail
```

- `message` is for the client and never contains values. Put values in `meta` (a plain record, for the logs).
- Helpers: `badRequest` 400, `unauthorized` 401, `forbidden` 403, `notFound` 404, `conflict` 409, `unprocessable` 422, `unavailable` 503. `conflict` and `unprocessable` take an optional specific `code` (for example `'duplicate'`, `'last_admin'`).
- Database calls: wrap the query in `fail.guard('op', () => query, meta)`, or catch and `throw fail.dbError('op', error, meta)`. `dbError` (in `db-errors.ts`, the one place that reads Postgres codes) maps:

| Postgres / driver                                                          | Status | Code                   |
| -------------------------------------------------------------------------- | ------ | ---------------------- |
| `23505` unique                                                             | 409    | `conflict`             |
| `23503` foreign key, row still referenced                                  | 409    | `in_use`               |
| `23503` foreign key, row missing                                           | 422    | `unknown_reference`    |
| `23514` check                                                              | 422    | `validation_error`     |
| `22P02` invalid input                                                      | 400    | `bad_request`          |
| `57014` timeout/canceled, connection refused/reset/DNS, pooler auth, `08*` | 503    | `database_unavailable` |
| anything else                                                              | 500    | `internal_error`       |

503 is a "try again" condition, not a bug. A wrapper may add context only when it has some; pass the original as `cause`.

An error that was not wrapped still gets the right answer: the global handler treats anything with a Postgres code through `dbError` (layer `route`, op `unhandled`) and everything else as a generic 500 whose text is never sent to the client.

## Who logs what

The global `onError` logs once per failed request. Services and repositories do not log what they throw. Known failures (status below 500) are `warn`, the rest `error`. The entry holds `code`, `status`, `layer`, `op`, `meta`, `requestId`, `method`, `path` and `err: { name, message, pgCode?, stack }`.

- `meta` values under keys like `password`, `token`, `secret`, `authorization`, `cookie`, `email` are masked as `[redacted]`.
- `err` is the innermost cause, with one stack (our helper frames and `node_modules` frames are dropped). Drizzle wraps the driver error in a `DrizzleQueryError` whose message is the whole query; the `err` serializer looks through it, so SQL text and bound parameters are never logged at `warn` or `error`. They appear only at `debug`, as a separate `failed query` entry.
- Every request also logs one `info` line with `requestId`, `method`, `path`, `status`, `ms`.

## Request id

`x-request-id` from the client is used only if it is short (up to 64 characters) and safe (letters, digits, `-`, `_`, `=`). Otherwise a UUID is generated.

## How to read dev logs

`pnpm dev` prints through `pino-pretty` (only when `NODE_ENV=development`; production and tests stay JSON, tests silent). A failure is one short block:

```
[21:33:08] ERROR: database_unavailable
    code: "database_unavailable"
    status: 503
    layer: "repository"
    op: "catalog.repository.findProducts"
    meta: { "includeDeleted": false }
    requestId: "b61aaf9c-…"
    method: "GET"
    path: "/api/products"
    err: {
      "name": "PostgresError",
      "message": "canceling statement due to statement timeout",
      "pgCode": "57014",
      "stack": …
    }
```

Read it top to bottom: `code`/`status` is what the client got, `layer` + `op` is where, `meta` is the values involved, `requestId` ties it to the response header and the request line, `err` is the real reason (`pgCode` is the Postgres error code). For the same failure the response body in development also carries `debug`. To see the failed SQL, run with `LOG_LEVEL=debug`.

The dev server (`dev.ts`) also logs unhandled rejections and uncaught exceptions at `fatal` and keeps running; the Vercel entry does not install these.

## Adding a code

1. Add it to `errorCodes` in `packages/validators/src/http.ts`.
2. Throw it with `fail.conflict(op, message, meta, 'your_code')` (or the helper that fits its status).
3. Add the translated text in the web (`en.ts` and `tr.ts`) when the UI should show it.
4. Document it on the route (`errorResponses(...)` in `describeRoute` adds the standard ones; `errorResponse('…')` describes a specific one).
