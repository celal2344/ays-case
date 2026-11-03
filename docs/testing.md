# Testing

## Layers
| Layer | Tool | What | Where |
|---|---|---|---|
| Unit | Vitest | Pure functions: `applyOverlay`, filter/sort/paginate pipeline, cart totals, quantity clamp, search param schema, storage migrations | `src/<area>/test/*.test.ts` |
| Store | Vitest | Zustand stores: overlay create/update/remove/reset, cart add/merge/clamp/remove-everywhere, auth login/logout/bootstrap | `src/features/<feature>/test/store.test.ts` |
| Integration | Vitest + RTL + MSW | Pages with mocked DummyJSON: login, shop list filters, add to cart, admin create/edit/delete, checkout | `src/<area>/test/*.test.tsx` |
| E2E | Playwright (Chromium, + mobile viewport) | Full flows against the dev server, DummyJSON mocked with `page.route` for stability | `e2e/*.spec.ts` |

MSW handlers in `src/test/msw/handlers.ts` mirror [api.md](api.md) with fixtures from a trimmed real response (`src/test/fixtures/products.json`, 20 items). Tests never hit the real network (`onUnhandledRequest: "error"`).

Test helper `renderWithProviders(ui, { route, authState })` creates a fresh QueryClient (retry off), router, and resets all Zustand stores + localStorage between tests.

## Must-have test cases (mapped to requirements)
| Req | Case |
|---|---|
| AUTH-1/2 | Login success navigates to redirect target; invalid credentials shows DummyJSON message |
| AUTH-4 | Logged-out visit to `/cart` → `/login?redirect=/cart` |
| AUTH-6 | Persisted token + `/auth/me` 200 → stays logged in after reload; 401 then refresh 200 → retried; refresh 401 → logged out |
| AUTH-7 | `user` and `moderator` roles on `/admin` → `/forbidden`; admin sees Admin nav and can also use the cart |
| AUTH-5 | Logout clears tokens, query cache, redirects |
| PROD-3 | Admin creates product → appears first in shop list, has id ≥ 100000, survives store rehydrate |
| PROD-4 | Edit remote product → PUT sent, list and detail show new price; edit local product → no request |
| PROD-5 | Delete → confirm → gone from list, detail 404, removed from carts |
| CART-1/2/3 | Add twice → qty 2; stepper clamps to stock; remove; clear |
| CART-4 | Cart per user: user A's cart not visible to user B |
| CART-5 | Checkout → `POST /carts/add` → order in history with snapshot prices → stock decremented → cart empty |
| EX-1..4 | URL `?q=phone&category=smartphones&sort=price&order=desc&page=2` renders matching results; changing filter resets page to 1 |
| PDP-1..6 | Breadcrumb links; thumbnail click swaps image, zoom opens; discount/old price/low-stock shown; Buy now adds and navigates to `/checkout`; similar products exclude current; sticky bar appears after scroll |
| REV-1..5 | Seeded + local merged; histogram counts; add review (one per user), edit/delete own, admin deletes any; verified-buyer badge only with an order; survives rehydrate |
| USER-1..5 | List merges overlay; create → local id ≥ 100000; edit local user → no request; delete hides user and clears cart; cannot delete self or last admin; role patch applied after login |
| EX-8 | Translation parity script passes |

## E2E specs
1. `auth.spec.ts` — login admin, login user, guard redirect, logout, reload keeps session.
2. `shop.spec.ts` — search, filter, sort, paginate, detail, add to cart (desktop + 390px mobile).
3. `admin.spec.ts` — create → edit → delete, reflected in shop.
4. `checkout.spec.ts` — cart → checkout form validation → order placed → history.
5. `a11y.spec.ts` — axe-core (WCAG 2.0/2.1 A and AA) on every main page, light and dark.
6. `responsive.spec.ts` — no horizontal scroll on any page at desktop and Pixel 7 viewports.

DummyJSON is served from the shared unit-test fixtures by `e2e/support/mock-api.ts` (`page.route`), so the specs never touch the network. Runs: `pnpm e2e` (Chromium desktop + Pixel 7; starts `pnpm dev` and reuses a running one locally). CI has a separate `e2e` job that uploads the HTML report.

## Coverage target
Lines ≥ 80% on `src/features/**` and `src/lib/**` (report only, not a CI gate — pure functions should be ~100%).

## Manual QA checklist (run before submitting)
- [ ] 360px / 768px / 1280px: no horizontal scroll, nav sheet works, tables scroll
- [ ] Dark mode on every page, no unreadable text
- [ ] TR and EN on every page, no missing keys, currency/date formatted per language
- [ ] Keyboard only: login, add to cart, checkout, admin delete dialog
- [ ] Hard refresh on every route (Vercel rewrite works, session restored)
- [ ] Offline (DevTools) → error states with Retry
- [ ] Reset demo data restores original catalog
- [ ] Lighthouse: Performance ≥ 90, Accessibility ≥ 95 on `/products`
- [ ] No console errors/warnings

## Test location
Tests live in a dedicated `test/` folder next to the code they cover, never beside the source file: `src/features/<feature>/test/`, `src/lib/test/`, `src/components/<group>/test/`, `src/preferences/test/`. Shared helpers (MSW handlers and server, `renderApp`, setup) stay in `src/test/`. Tests import the unit under test with `../`.
