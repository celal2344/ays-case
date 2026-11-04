# Backend handoff

For the agent (or person) building a real backend for `ays-case`. Read this first, then `docs/api.md`, `docs/data-and-state.md`, `docs/conventions.md` and the ADRs in `docs/decisions/`. Everything here was derived from the code on `main`; where a statement is a recommendation rather than a fact, it says so.

## 1. Where the project stands

A finished frontend case study (Vite 8, React 19, TypeScript, TanStack Router/Query/Form/Table, Zustand, Axios, Zod 4, i18next TR/EN, Tailwind 4 + shadcn). It is deployed at https://ayscase.vercel.app. It talks to **DummyJSON** (`VITE_API_BASE_URL`, default `https://dummyjson.com`), a read-only fake API. Because DummyJSON persists nothing, every write lives in a **local overlay** in the browser (persisted Zustand stores), merged over the remote data by pure functions. A real backend replaces both DummyJSON and the overlays.

Demo accounts (real DummyJSON users): admin `emilys` / `emilyspass`, user `averyp` / `averyppass`.

## 2. Contract the frontend expects today

Every response is Zod-parsed at the boundary (`apps/web/src/features/*/api.ts`, schemas in `apps/web/src/features/*/schemas.ts`). A backend can either match these shapes exactly, or change the schema and `api.ts` in the same PR. Do not change shapes silently: the MSW fixtures in `apps/web/src/test/` and the Playwright mock in `apps/web/e2e/support/mock-api.ts` mirror them.

| Method + path                                                       | Request                                                                                  | Response the frontend parses                                                                                                      | Today's behaviour                                                                                              |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `POST /auth/login`                                                  | `{ username, password, expiresInMins: 60 }`                                              | `{ accessToken, refreshToken, id, username, email, firstName, lastName, image }` (no role)                                        | DummyJSON accounts                                                                                             |
| `GET /auth/me`                                                      | Bearer                                                                                   | `{ id, username, email, firstName, lastName, image, role }`, `role` is `admin \| moderator \| user`                               | Run right after login and on app start; any failure after one refresh attempt logs out                         |
| `POST /auth/refresh`                                                | `{ refreshToken, expiresInMins: 60 }`                                                    | `{ accessToken, refreshToken }`                                                                                                   | Single-flight 401 recovery in `apps/web/src/lib/http.ts`; login/refresh are never retried                      |
| `GET /products`                                                     | `?limit=0&select=<fields>`                                                               | `{ products: Product[] }`                                                                                                         | **Whole catalog in one request** (about 194 items); search, filter, sort and paging run client-side (ADR-0004) |
| `GET /products/{id}`                                                |                                                                                          | Product plus `images[]`, `sku`, `weight`, `dimensions`, `warrantyInformation`, `shippingInformation`, `returnPolicy`, `reviews[]` | Detail page                                                                                                    |
| `GET /products/categories`                                          |                                                                                          | `{ slug, name, url }[]`                                                                                                           |                                                                                                                |
| `POST /products/add`, `PUT /products/{id}`, `DELETE /products/{id}` | fields: title, description, category, brand, price, discountPercentage, stock, thumbnail | `{ id }` (delete: `{ id, isDeleted }`)                                                                                            | Simulated; real result is stored in the product overlay                                                        |
| `GET /users`                                                        | `?limit=0&select=id,username,firstName,lastName,email,role,image`                        | `{ users: User[] }`                                                                                                               | Admin panel, client-side filtering                                                                             |
| `POST /users/add`, `PUT /users/{id}`, `DELETE /users/{id}`          | username, firstName, lastName, email, role                                               | `{ id }` (delete: `{ id, isDeleted }`)                                                                                            | Simulated; `role` is ignored by DummyJSON                                                                      |
| `POST /carts/add`                                                   | `{ userId, products: [{ id, quantity }] }`                                               | `{ id, ... }` (only `id` is used, as `remoteCartId`)                                                                              | Checkout receipt only                                                                                          |

Product shape (list): `id, title, description, category (slug), price, discountPercentage, rating, stock, brand?, thumbnail, availabilityStatus?, minimumOrderQuantity?, tags[]`. A seeded review is `{ rating, comment, date, reviewerName, reviewerEmail }`.

## 3. What is faked in the browser and needs a server

These stores are the backend's real scope. Keys are `ays-case:v1:<name>` (`apps/web/src/lib/storage.ts`).

| Store (file)                                             | What it holds                                           | Becomes                                                                                                                                         |
| -------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth`                                                   | tokens, user                                            | Real sessions. Keep Bearer tokens plus refresh; the app deliberately sets no `withCredentials`                                                  |
| `product-overlay` (`features/products/overlay-store.ts`) | `created` (local ids from 100000), `patched`, `deleted` | Real product CRUD, admin only. Local ids and the `isLocal(id)` "skip the network call" rule disappear                                           |
| `user-overlay` (`features/users/overlay-store.ts`)       | same shape for users, ids from 100000                   | Real user CRUD with **persisted roles**, admin only. Deleting your own account, demoting yourself, or removing the last admin should be refused |
| `cart` (`features/cart/store.ts`)                        | lines per user id                                       | Server cart per user (or keep client-side and only send it at checkout, see decisions)                                                          |
| `orders` (`features/orders/store.ts`)                    | `Order[]`                                               | Real orders, see below                                                                                                                          |
| `reviews` (`features/reviews/store.ts`)                  | local reviews, hidden seeded reviews                    | Real reviews, see below                                                                                                                         |
| `favorites`, `recently-viewed`, `recent-searches`        | per-user id lists / per-browser strings                 | Optional. Fine to keep local; if moved, favorites and recently viewed are per user                                                              |
| `prefs`, `theme`, `pending-action`                       | UI preferences, a one-shot "after login" action         | Stay client-side                                                                                                                                |

"Reset demo data" (`features/admin/reset.ts`) clears all of the overlays. With a real backend it becomes either a seed/reset endpoint for the demo, or goes away. Decide explicitly.

### Orders

`Order` is `{ id, userId, createdAt, lines[], totals { subtotalCents, discountCents, totalCents }, shipping { fullName, address, city, phone }, remoteCartId? }`. A line is **frozen at purchase**: `productId, title, thumbnail, listCents, unitCents, discountPercentage, quantity`, so later admin edits never rewrite history. Keep that snapshot server-side.

Current checkout sequence (`features/orders/hooks/use-place-order.ts`): read cart, catalog and overlay fresh, check stock (a `CheckoutError` on shortage), `POST /carts/add` for remote ids only, write the order, `decrementStock`, clear the cart. On a real backend this must be **one atomic server operation** (validate stock, price from the server's own catalog, create the order, decrement stock, clear the cart in one transaction). The client must stop computing authoritative totals. It still computes them for display.

### Reviews

Rules today: a signed-in user adds **one review per product** (rating 1 to 5 integer, comment 10 to 500 characters), may edit and delete their own, admins can delete any; "verified buyer" means the author has an order containing that product; rating average and the 5-to-1 histogram include seeded and local reviews. These belong on the server. Seeded DummyJSON reviews have no author id.

## 4. Rules the backend must enforce

The frontend currently trusts itself. Enforce server-side:

- Money is **integer cents**. Sale price = list price with the discount percentage applied; the exact rounding is in `features/products/pricing.ts` (`salePriceCents`, `toCents`) and has tests. Match it.
- Authorization is `role === 'admin'` only. `moderator` exists as a value but has no behaviour. Admins can also shop (cart, checkout, orders).
- Admin-only: product create/update/delete, user CRUD, role changes, deleting any review.
- Stock can never go negative; `minimumOrderQuantity` exists on products. The UI caps quantity at stock.
- Deleting a product removes it from carts, favorites, recently viewed and reviews; past orders keep their snapshot.
- Shipping validation (mirror `shippingSchema`): fullName 2 to 80, address 5 to 200, city 2 to 60, phone `^\+?[0-9 ()-]{7,20}$`. User validation: username 3 to 30, names 1 to 50, valid email, role in the enum.
- Known frontend gap to close with the backend: `?redirect=` after login is not validated (open redirect). Same-origin relative paths only.

## 5. Architecture rules to keep when integrating

From `AGENTS.md` and `docs/conventions.md`:

- Components never import `lib/http` or `features/*/api` directly. They use the feature hooks.
- Never read product data from Query without the overlay merge (`useCatalog`, `useProduct`). If the overlay goes away, replace those hooks' internals, not their callers.
- Zod-parse every API response in `api.ts`. No `any`, no `console.log`, no TODOs left behind.
- All user-facing text through i18n; add keys to both `en.ts` and `tr.ts` (`pnpm check:translations` enforces parity).
- Exact dependency versions, latest versions; say why for any new dependency.
- `apps/web/src/components/ui/*` is shadcn output: only change through the shadcn CLI.
- Persisted stores have `version` plus `migrate`; keys come from `lib/storage.ts`.
- Tests live in a `test/` folder next to what they cover. Unit/component: Vitest + RTL + MSW (`onUnhandledFrame: 'error'`). E2E: Playwright (chromium + Pixel 7) against `apps/web/e2e/support/mock-api.ts`, which serves the shared fixtures with `page.route`. A new endpoint needs a fixture, an MSW handler and a mock-api route, or the tests fail on unhandled requests.
- Never commit `Frontend Case.pdf` (excluded locally).

## 6. Suggested approach (recommendation, not a decision)

1. **Keep the contract, swap the base URL.** Build the backend to serve the endpoints in section 2 with the same shapes, and point `VITE_API_BASE_URL` at it. The frontend then works unchanged, which makes the first PR small and verifiable.
2. **Then add what DummyJSON could not do**, one feature per PR: persisted product CRUD, persisted user CRUD with roles, orders (atomic checkout), reviews. For each, delete the matching overlay store and its merge function, and update the tests that rely on it.
3. **Keep serving the catalog as one list** at first (`limit=0`). ADR-0004 chose client-side search over a full catalog; moving to server-side pagination and search is a larger change (the URL-driven search params, filters, suggestions and best-deals all assume the full list) and should be its own decision.
4. **Seed from DummyJSON** (products, categories, users with their roles) so the demo data and the two demo accounts keep working.
5. **Same origin, no CORS**: web and API deploy as one Vercel project using Services (root `vercel.json`), the API under `/api`. The api-client base URL is `/api`; in dev Vite proxies `/api` to the local API.
6. The SPA fallback rewrite lives in the `web` service of the root `vercel.json`.

## 7. Open questions for the owner

- Backend stack, database, hosting.
- Keep DummyJSON as a seed or fallback, or drop it completely?
- Auth: keep the `/auth/login` + `/auth/me` + `/auth/refresh` shape with JWT (least frontend change), or something else?
- Should the cart, favorites and recently viewed move server-side, or stay local?
- What happens to "Reset demo data" and the demo accounts?
- Deadline and submission format (still undecided).

## 8. How to verify any change

```bash
pnpm lint && pnpm typecheck && pnpm check:translations
pnpm --filter @ays/web exec vitest run <changed test files>   # the full local suite is slow on the owner's machine
pnpm --filter @ays/web exec playwright test <spec> -g "<name>" --project=chromium
```

Workflow: one PR per issue, opened with `gh`; **the owner merges**. Commits are conventional (`feat(orders): ...`). Do not wait on CI, and never force-push without being told.
