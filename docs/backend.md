# Backend

The API is a Hono app (`apps/api`) on Postgres (Supabase) through Drizzle, with Better Auth for sessions. It is served under `/api` on the same origin as the web app. Interactive docs: `/api/docs` (Scalar); the OpenAPI document is at `/api/openapi.json`. Endpoint details and examples are in [api.md](api.md); this page says what exists and where each rule lives.

## Layers

Every module is `routes.ts` (HTTP only) → `service.ts` (rules, transactions) → `repository.ts` (all Drizzle code). Lint enforces the imports; see [architecture.md](architecture.md#api-layers). Shared request and response schemas live in `@ays/validators`; the web app gets its types from `hc<AppType>` in `@ays/api-client`.

## Endpoints by area

| Area            | Routes                                                                  | Access                       |
| --------------- | ----------------------------------------------------------------------- | ---------------------------- |
| Catalog         | `GET /products`, `GET /products/:id`, `GET /categories`                 | public                       |
| Cart            | `/cart`, `/cart/items`                                                  | signed in, own data only     |
| Favorites       | `/favorites`                                                            | signed in, own data only     |
| Recently viewed | `/recently-viewed`                                                      | signed in, own data only     |
| Orders          | `POST /orders`, `GET /orders`, `GET /orders/:id`                        | signed in, own data only     |
| Reviews         | `POST /products/:id/reviews`, `PATCH/DELETE /reviews/:id`               | signed in                    |
| Admin catalog   | `POST/PATCH/DELETE /products`, `POST /products/:id/restore`, `/admin/*` | admin                        |
| Admin users     | `/users`                                                                | admin                        |
| Auth            | `/auth/*` (Better Auth: sign-in by username, session, sign-out)         | public, sign-up disabled     |
| Health          | `GET /health`                                                           | public, needs no database    |

## Where each rule is enforced

| Rule                                                              | Enforced in                                           |
| ----------------------------------------------------------------- | ----------------------------------------------------- |
| Who may call what (401 and 403)                                   | `middlewares/auth.ts` (`requireAuth`, `requireRole`)  |
| Request validation (422)                                          | `@ays/validators` schemas through `validationHook`    |
| Prices, discounts, ratings, availability                          | SQL and services; the browser never computes them     |
| Checkout: stock check, order and lines, stock decrement, cart clear | `orders/service.ts`, one transaction                |
| One review per user and product; edit own, delete own or admin    | `reviews/service.ts` and a unique constraint          |
| Soft delete of products, cleanup of carts and lists               | `admin/products/service.ts` + repository              |
| Last admin, no self delete or demote                              | `admin/users/service.ts`                              |
| Uniqueness, foreign keys, value limits                            | Postgres constraints, mapped by `utils/db-errors.ts`  |
| Row level security                                                | on for every table (no policies); test in `hardening.test.ts` |
| Sign-in rate limit: 5 attempts per minute per IP, then 429        | Better Auth `rateLimit`, stored in the `rate_limit` table |
| Session cache: 5 minutes                                          | Better Auth `session.cookieCache` (see [api.md](api.md)) |

## Error model

Every error body is `{ code, message, requestId }`. Services and repositories throw `appError` / `dbError`; the single `onError` handler turns them into the response and one log line. See [errors.md](errors.md).

## Database

- Schema in `apps/api/src/db/schema`, migrations in `apps/api/src/db/migrations` (`pnpm --filter @ays/api db:generate`, then `db:migrate:dev` or `db:migrate:prod`).
- **Row level security** is enabled on every table with no policies. The API connects as the table owner, which bypasses RLS, so it keeps working, while anyone using Supabase's Data API with the anon key gets nothing. The `product_rating_stats` view runs with its caller's rights (`security_invoker`). A new table must call `.enableRLS()`; the test fails otherwise.
- The runtime uses the transaction pooler (`DATABASE_URL`, port 6543, prepared statements off). Migrations and database tests use the session pooler (`DATABASE_URL_SESSION`, port 5432).
- There is no seed script. The catalog and demo users already live in the database. The tests build their own small data set from `apps/api/test/fixtures`.

### Restoring the old seed

The seed scripts and data were removed from `main`; the tag `seed-v1` has them:

```bash
git checkout seed-v1 -- apps/api/src/db/seed.ts apps/api/src/db/seed-data apps/api/src/scripts/seed.ts
```

Then add the `db:seed` and `db:seed:prod` scripts from `git show seed-v1:apps/api/package.json` and run them against an empty, migrated database.

### Demo accounts

`emilys` / `emilyspass` (admin) and `averyp` / `averyppass` (user). They are public on purpose: this is a demo shop. Nobody can sign up; admins create other users in the admin panel.

## Operations

- **Free Supabase projects pause after about a week of inactivity.** The API then answers 503 `database_unavailable`. Open the project in the Supabase dashboard and press *Restore project*; it is back after a minute or two, with the data intact.
- **Vercel project:** one project using Services, root directory `./`, configured by the root `vercel.json` (web at `/`, API at `/api`, API function in `sin1` next to the database). Set these environment variables for both Production and Preview (names only here, values in the Vercel dashboard): `DATABASE_URL`, `DATABASE_URL_SESSION`, `BETTER_AUTH_SECRET`, `LOG_LEVEL`. `BETTER_AUTH_URL` is optional: Better Auth derives its URL and trusted origins from Vercel's system variables.
- **Env files:** `apps/api/.env.development` and `.env.production` (migrations from a developer machine only) are copied from the `*.example` files next to them.
