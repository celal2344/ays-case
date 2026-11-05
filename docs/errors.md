# API errors

Every error body is `{ code, message, requestId }` (validation errors add `errors: { field, message }[]`). `code` is one of `errorStatus` in `@ays/validators`, which also fixes its HTTP status. `requestId` is also the `x-request-id` response header; an incoming one is used only if it is up to 64 characters of letters, digits, `-`, `_`, `=`. The client never sees `op`, `meta`, SQL or a stack.

## How to throw

Only repositories and services throw; handlers do not catch, and services never return error bodies.

```ts
throw appError('not_found', 'Product not found', 'catalog.findProductDetail', { id })
throw dbError(error, 'admin.products.create', { sku }) // from a catch around a query
```

`message` is for the client and never contains values; values go in `meta`. `dbError` (in `utils/db-errors.ts`) is the one place that reads Postgres codes: `23505` to 409 `conflict`, `23503` to 409 `in_use` / 422 `unknown_reference`, `23514` to 422, `22P02` to 400, and a timeout (`57014`), unreachable database or pooler login failure to 503 `database_unavailable` ("try again", not a bug). Anything else is a generic 500. Queries that nobody wraps still get this mapping from the global handler.

To add a code, add it with its status to `errorStatus`, and describe it on the route (`errorResponses(404, 401)` in `describeRoute` adds the standard ones).

## Logs

`onError` logs once per failed request: `warn` below 500, `error` otherwise, with `code`, `status`, `op`, `meta`, `requestId`, `method`, `path` and `err: { name, message, pgCode?, stack }`. `err` is the innermost cause with one short stack; Drizzle's wrapper (whose message is the whole query) is looked through, so SQL and bound parameters are never logged. `meta` values under keys like `password`, `token`, `secret`, `authorization`, `cookie`, `email` are masked.

## How to read dev logs

With `NODE_ENV=development` logs go through `pino-pretty`; production and tests stay JSON (tests silent). A failure is one short block:

```
[21:33:08] ERROR: database_unavailable
    code: "database_unavailable"
    status: 503
    op: "unhandled"
    requestId: "b61aaf9c-…"
    method: "GET"
    path: "/api/products"
    err: { "name": "PostgresError", "message": "canceling statement due to statement timeout", "pgCode": "57014", "stack": … }
```

`code`/`status` is what the client got, `op` is where (`unhandled` means a database error nobody wrapped with `dbError`; the stack shows the origin), `meta` the values involved, `requestId` ties it to the response, `err` is the real reason. In development the response body also carries the same as a `debug` object. The dev server logs unhandled rejections and uncaught exceptions at `fatal` and keeps running.
