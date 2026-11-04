# API

The web app talks to our own API, served on the same origin under `/api` (Vite proxies `/api` to `localhost:3000` in development; one Vercel project serves both in production). Interactive docs: `/api/docs` (Scalar), spec: `/api/openapi.json`.

## Two clients

| Use                               | Client                                                   | Where                                                  |
| --------------------------------- | -------------------------------------------------------- | ------------------------------------------------------ |
| Resources (catalog, users)        | Hono RPC `hc<AppType>('/api')` through `@ays/api-client` | `lib/api.ts`, used by `features/*/api.ts`              |
| Auth (sign in, session, sign out) | Better Auth `authClient`                                 | `lib/auth-client.ts`, used by `features/auth/store.ts` |

Response and request types come from the API's routes (`AppType`) and the shared validators in `@ays/validators`, so there is no hand-written response type and no re-parsing in the browser.

## Endpoints in use

| Endpoint                          | Auth   | Notes                                                                                                                                             |
| --------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/products`               | public | whole catalog in one list (ADR-0004); money in integer cents, `rating` null when unreviewed, `availability` derived by the API                    |
| `GET /api/products/:id`           | public | adds images, sku, weight (g), dimensions (mm), warranty/shipping/return policy, reviews and the 1 to 5 `ratingHistogram`; 404 `{ code, message }` |
| `GET /api/categories`             | public |                                                                                                                                                   |
| `GET /api/users`                  | admin  | 401 without a session, 403 for other roles                                                                                                        |
| `GET/POST/PUT/DELETE /api/cart…` | session | `GET /cart`, `POST /cart/items` `{ productId, quantity }` (adds, capped at stock), `PUT /cart/items/:productId` `{ quantity }` (clamped to 1..stock), `DELETE /cart/items/:productId`, `DELETE /cart`; 404 unknown or deleted product, 409 `out_of_stock`, 422 quantity below 1 |
| `GET /api/favorites`, `PUT/DELETE /api/favorites/:productId` | session | product ids, newest first; PUT and DELETE are idempotent (204) |
| `GET /api/recently-viewed`, `PUT /api/recently-viewed/:productId`, `DELETE /api/recently-viewed` | session | product ids, newest first; a PUT trims the list to the newest 12 |
| `POST /api/orders` | session | body `{ shipping }` only; one transaction creates the order from the server cart (server prices), takes stock, empties the cart. 201; 422 `cart_empty`; 409 `insufficient_stock` or `product_unavailable` (nothing changes) |
| `GET /api/orders`, `GET /api/orders/:id` | session | my orders, newest first, with frozen lines; another user's id is 404 |
| `POST /api/products/:id/reviews`, `PATCH /api/reviews/:id`, `DELETE /api/reviews/:id` | session | one review per user and product (409 `review_exists`); edit is the author's; delete is the author's or an admin's; the product's rating, count and histogram update by themselves |
| `POST /api/auth/sign-in/username` | public | `{ username, password }`, sets the session cookie                                                                                                 |
| `GET /api/auth/get-session`       | cookie | the session user, including `role`                                                                                                                |
| `POST /api/auth/sign-out`         | cookie |                                                                                                                                                   |

Demo accounts: `emilys` / `emilyspass` (admin), `averyp` / `averyppass` (user). Self sign-up is disabled.

## Admin endpoints

All of them require an admin session. Bodies are the schemas in `@ays/validators` (`productBodySchema`, `userCreateBodySchema`, ...); a failure body is `{ code, message }`.

| Endpoint | Notes |
| --- | --- |
| `GET /api/admin/products` | Every product, soft-deleted ones included (`deletedAt`) |
| `POST /api/products` | Create; `201` with the product detail. `409 duplicate` (sku or barcode), `422 unknown_reference` (category, brand, policy or tag) |
| `PATCH /api/products/:id` | Partial update; `tagIds` and `images`, when sent, replace the old sets (one primary image, unique positions) |
| `DELETE /api/products/:id` | Soft delete: hidden from the shop, removed from carts, favorites and recently viewed; order lines keep it. `204` |
| `POST /api/products/:id/restore` | Brings a soft-deleted product back |
| `GET/POST /api/admin/{categories,brands,tags,warranty-policies,shipping-policies,return-policies}` | List and create; the slug is made from the name when not given. `409 duplicate` |
| `PATCH/DELETE /api/admin/<table>/:id` | Edit or delete a row; `409 in_use` while products still use it |
| `GET /api/users` | All users |
| `POST /api/users` | username, first and last name, email, role and an initial password (hashed by Better Auth) |
| `PATCH /api/users/:id` | names, email, username, role |
| `DELETE /api/users/:id` | `204`; the user's sessions stop working |

User rules, all `409`: `cannot_delete_self`, `cannot_demote_self`, `last_admin`, `duplicate` (username or email).

## Rules

1. **Cookie session, same origin.** No tokens in JS, no CORS, no `localStorage` for auth.
2. **`call()`** wraps every RPC request: transport failures become `AppError('network')`, non-2xx answers become an `AppError` of the right `kind` from the `{ code, message }` body, and a 401 while signed in ends the session (toast, redirect to `/login`).
3. **Derived figures stay on the server.** Rating, review count, histogram and availability are computed in SQL; the browser only formats them.
4. **One type, cents everywhere.** The UI, the cart and the tests use the types from `@ays/validators` directly. Money stays in integer cents and is formatted at render time (`formatMoney`); grams and millimetres are formatted by `formatWeight` and `formatDimensions`. The admin form collects dollars and converts once with `toCents` on submit.
5. **Admin writes are server-side.** Every admin route answers 401 without a session and 403 for a non-admin. The server validates the limits shared in `@ays/validators` (`LIMITS`) and enforces uniqueness, the user guards and soft delete ([data-and-state.md](data-and-state.md)).

## Errors

`AppError { kind, message, status, code }` (`code` is the API's machine-readable error code, e.g. `insufficient_stock`), where `kind` is one of `network | unauthorized | forbidden | not_found | validation | server`. The UI maps `kind` to an i18n message (`lib/error-message.ts`); the server's message is shown for validation errors such as a failed sign-in.

## Tests

Vitest runs against MSW handlers at `http://localhost/api/...` that return the API's wire shapes from the shared fixtures (`src/test/fixtures`). The mocked server keeps the signed-in user in `serverSession` (Node's `fetch` has no cookie jar). `FakeAdmin` (`src/test/fixtures/admin.ts`) gives the mocked server stateful admin products, lookups and users with the same guards as the real API; `serveCatalog` (`src/test/catalog.ts`) lets a test serve a changed catalog. Playwright specs use the same fixtures through `e2e/support/mock-api.ts`.
