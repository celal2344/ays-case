# Implementation plan

Gate-based, same flow as StokMate: consultant plan (this doc) → lead agent runs one gate → lead tests/reviews → I review/test → commit. **Delivery: one PR per gate** from branch `gate/gN-name`; once the gate is green the PR is opened and work stops until the owner approves (merge first, then the next gate starts). A gate is done only when its **Done when** list passes and `pnpm lint && pnpm typecheck && pnpm test` is green.

| Gate | Goal | Reqs | Est. |
|---|---|---|---|
| G0 | Scaffold + tooling + CI | T-1..T-5, NF-3, EX-10 | 0.5 d |
| G1 | App shell, layout, theme, i18n, feedback components | NF-2, NF-5, EX-7, EX-8 | 0.5 d |
| G2 | Auth (store, axios, guards, login page) | AUTH-1..7 | 0.75 d |
| G3 | Catalog read: list, filters, basic detail | PROD-1, PROD-6, PROD-9, EX-1..4, EX-12, EX-14 | 0.75 d |
| G3b | Product detail (Trendyol-style) + reviews | PDP-1..6, REV-1..5, EX-5 | 1 d |
| G4 | Cart | PROD-7, CART-1..4 | 0.5 d |
| G5 | Admin CRUD + overlay | PROD-2..5, EX-13, EX-15 | 1 d |
| G5b | Admin users (CRUD via overlay) | USER-1..5 | 0.75 d |
| G6 | Checkout + orders | PROD-8, CART-5, EX-6 | 0.5 d |
| G7 | E2E, a11y, responsive polish | EX-9, NF-2 | 0.5 d |
| G8 | Deploy + README + submission | EX-11, NF-4 | 0.25 d |
| | **Total** | | **~7.25 d** (cut list at the bottom if the deadline is shorter) |

---

## G0 — Scaffold
**Tasks**
1. `pnpm create vite ays-case --template react-ts`; pin pnpm in `packageManager` + `engines`.
2. Add exact-version deps: react 19, `@tanstack/react-router` + router-plugin, `@tanstack/react-query` + devtools, `@tanstack/react-form`, `@tanstack/react-table`, zustand, axios, zod, i18next, react-i18next, lucide-react, sonner, clsx, tailwind-merge, class-variance-authority.
3. Tailwind 4 via `@tailwindcss/vite`; `shadcn init` (New York, neutral, CSS vars); add: button, input, label, card, badge, select, dialog, alert-dialog, sheet, dropdown-menu, skeleton, table, pagination, separator, sonner, avatar, tooltip, toggle-group.
4. `@/` alias in `tsconfig` + `vite.config.ts`. `strict` + `noUncheckedIndexedAccess`.
5. ESLint flat config (typescript-eslint, react-hooks, react-refresh, @tanstack/eslint-plugin-query, @tanstack/eslint-plugin-router), Prettier + tailwind plugin (copy StokMate `prettier.config.mjs`).
6. Vitest + jsdom + RTL + `@testing-library/user-event` + MSW; `src/test/setup.ts`. Playwright installed (specs in G7).
7. Scripts: `dev build preview lint typecheck test test:watch e2e format format:check check:translations`.
8. `.github/workflows/ci.yml`: on push + PR → install (frozen lockfile) → lint → typecheck → test → build. (e2e job added in G7.)
9. `.env.example` with `VITE_API_BASE_URL=https://dummyjson.com`; `lib/env.ts` Zod-parses `import.meta.env`.
10. Commit `docs/`, `AGENTS.md`, README.

**Done when:** `pnpm dev` shows a page with a shadcn Button; one sample Vitest test passes; CI green on GitHub.

## G1 — App shell
**Tasks**
1. `router.tsx` with context `{ queryClient, auth }`, `__root.tsx` with `AppShell` (Header, `<Outlet/>`, `Toaster`), `/forbidden` page, router-level `defaultNotFoundComponent` and `defaultErrorComponent` (rendered inside `AppShell`).
2. `lib/query-client.ts` (retry 1 for queries, 0 for mutations, `refetchOnWindowFocus: false`).
3. `preferences` store (theme light/dark/system, language tr/en, shop view) with `persist`; apply theme class on `<html>`; system theme listener.
4. i18n setup, `locales/en.ts` + `tr.ts` typed (`en` is the source type, `tr satisfies typeof en`); copy StokMate parity script.
5. Header (desktop) + `MobileNav` (Sheet) + `PreferencesControls`; placeholder links. No header search (search lives in the `/products` toolbar).
6. `components/feedback`: `PageSkeleton`, `ErrorState` (message + Retry), `EmptyState`, `NotFound`, `Forbidden`.
7. `lib/storage.ts`: `storageKey(name) → "ays-case:v1:" + name`, safe JSON.
8. `lib/format.ts`: `formatPrice`, `formatDate` by current language.

**Done when:** theme and language switch and persist across reload; layout correct at 360/768/1280; parity script passes.

## G2 — Auth
**Tasks**
1. `features/auth/schemas.ts`: `loginResponseSchema`, `userSchema` (incl. `role: z.enum(["admin","moderator","user"])`).
2. `features/auth/api.ts`: `loginRequest`, `getMe`, `refreshTokens`.
3. `features/auth/store.ts` per [data-and-state.md](data-and-state.md#auth-store); persist tokens + user only (`partialize`).
4. `lib/http.ts` axios instance + request/response interceptors (single-flight refresh) per [api.md](api.md#axios-setup-libhttpts); `lib/http-error.ts`.
5. Find a `role: "user"` account (`/users/filter?key=role&value=user`) and an admin; put both in `features/auth/demo-accounts.ts`. Confirm `emilys` is admin; if not, pick another admin.
6. Routes: `login.tsx` (logged in → redirect away), `_auth.tsx`, `_auth/_admin.tsx` guards.
7. Login page: TanStack Form + Zod, Fill admin/user buttons, error display, redirect param.
8. User menu: avatar, name, role badge, Logout (clears tokens, `queryClient.clear()`, navigate `/login`).
9. Pending "add to cart while logged out" helper (`sessionStorage`), consumed after login (wired in G4).
10. Tests: store tests + integration tests listed for AUTH-* in [testing.md](testing.md).

`bootstrap()` logs out on any `/auth/me` failure left after one refresh attempt; there is no session-expiry watcher (a dead session is caught by the guard on the next navigation). `?redirect=` is not validated. The `role` enum keeps `moderator`, but nothing branches on it.

**Done when:** all AUTH-* criteria pass manually and in tests; reload keeps session; token expiry with `expiresInMins: 1` recovers via refresh.

## G3 — Catalog (read)
**Tasks**
1. `features/products/schemas.ts` (`productListItemSchema`, `productDetailSchema`, `categorySchema`), `api.ts` (`getCatalog`, `getProduct`, `getCategories`), `query-keys.ts`.
2. Create an **empty** overlay store now (`overlay-store.ts`, full shape, no UI) so the merge path is real from day one.
3. `catalog.ts` pure pipeline: `applyOverlay`, `filterByQuery`, `filterByCategory`, `sortProducts`, `paginate` + unit tests.
4. Hooks: `useCatalog()`, `useProductList(search)` (returns `{ items, total, pageCount }`), `useProduct(id)`, `useCategories()`.
5. `/products` route: Zod `validateSearch`, loader `ensureQueryData(catalog)`; toolbar (debounced search, category, sort, view toggle), `ProductGrid`, `ProductTable`, pagination; reset page on filter change.
6. `ProductCard`: image lazy + fallback, price/discount, rating, stock badges, Add to cart button (stub until G4).
7. `/products/$productId`: minimal page (title, image, price, description) with 404 for deleted/missing ids; the full layout is G3b.
8. Loading/error/empty states; integration tests for EX-1..4.

**Done when:** URL fully drives the list (copy/paste URL reproduces view, back button works); detail works for ids 1–194; Lighthouse perf OK with lazy images.

## G3b — Product detail + reviews
**Tasks**
1. `features/reviews/`: `schemas.ts` (seeded review from `reviews[]`, local review), `store.ts` (persisted `useReviewsStore`, version + migrate), `summary.ts` (`mergeReviews`, `summarize`, `sortReviews`) + unit tests.
2. PDP layout per [routes-and-pages.md](routes-and-pages.md#product-detail-trendyol-style-shadcn-neutral-theme): `Breadcrumb`, `Gallery` (thumbnails + zoom dialog), `PriceBlock`, `QuantityStepper`, Buy now + Add to cart (stubs until G4), attributes grid, `SimilarProducts` carousel (merged catalog, same category), tabs (Product info / Description / Reviews).
3. Reviews tab: summary + histogram, sort, review cards, write/edit/delete own (admin deletes any), verified-buyer badge (selector over orders, empty until G6), login prompt when logged out.
4. Sticky add-to-cart bar (IntersectionObserver) + mobile bottom bar.
5. i18n keys in en/tr; tests for PDP-1..6 and REV-1..5.

**Done when:** detail works for ids 1–194 and local ids; reviews survive reload; histogram matches seeded + local; layout correct at 360/768/1280.

## G4 — Cart
**Tasks**
1. `features/cart/store.ts` per [data-and-state.md](data-and-state.md#cart-store), persisted; `selectors.ts` (`selectLines`, `selectCount`, totals in cents).
2. `useCart()` binds current user id; `useCartView()` joins lines with `useCatalog()` and drops missing products (toast once).
3. Wire Add to cart on card + detail (respect stock, toast "Added", logged-out → login with pending action).
4. Header cart badge (`aria-live="polite"`).
5. `/cart` page: lines, stepper (clamp), remove, clear (confirm), summary, Checkout button.
6. Tests for CART-1..4.

**Done when:** cart survives reload, is isolated per user, quantities can't exceed stock.

## G5 — Admin CRUD
**Tasks**
1. Finish overlay actions (`create` with local ids, `update`, `remove`, `decrementStock`, `reset`) + store tests.
2. `api.ts`: `createProduct`, `updateProduct`, `deleteProduct` (Zod-parse echo).
3. Mutation hooks `useCreateProduct`, `useUpdateProduct`, `useDeleteProduct` — skip network for `isLocal(id)`; write overlay in `onSuccess`; delete also calls `cart.removeProductEverywhere`.
4. `/admin/products`: TanStack Table (sortable columns, search, category filter, pagination 20), row actions, delete `AlertDialog`.
5. `ProductForm` shared by new/edit (TanStack Form + `productFormSchema`), category select from `useCategories()`, thumbnail preview, unsaved-changes blocker.
6. `/admin` dashboard: stat cards + Reset demo data (confirm).
7. Integration tests for PROD-2..5.

**Done when:** create/edit/delete visible in shop, detail, cart instantly and after reload; no network call for local ids; reset restores the original catalog.

## G5b — Admin users
**Tasks**
1. `features/users/`: `schemas.ts` (`userSchema` shared with auth), `api.ts` (`getUsers`, `createUser`, `updateUser`, `deleteUser`, Zod-parsed), `query-keys.ts`, `overlay-store.ts`, pure `catalog.ts` (`applyUserOverlay`, filter, paginate) + unit tests.
2. Hooks `useUsers`, `useCreateUser`, `useUpdateUser`, `useDeleteUser` (skip network for local ids; write overlay in `onSuccess`; guardrails: no self-delete/demote, no last-admin removal; delete also clears that user's cart).
3. Apply the user-overlay patch on top of `/auth/me` in `login` and `bootstrap`.
4. `/admin/users` table (reuse the admin table shell from G5), `UserForm` for new/edit, delete `AlertDialog`; header Admin menu gets Users.
5. Reset demo data also resets the user overlay and reviews; dashboard shows user count.
6. Integration tests for USER-1..5.

**Done when:** create/edit/delete reflected after reload; a role edit takes effect on that user's next login; guardrails block self-delete and last-admin removal.

## G6 — Checkout + orders
**Tasks**
1. `features/orders/store.ts` (persisted, per user) + `api.ts` (`createRemoteCart` → `POST /carts/add`).
2. `/checkout` route guard (empty cart → `/cart`), shipping form (Zod), summary.
3. `usePlaceOrder()` mutation: stock check → remote cart for remote ids (check DummyJSON's behaviour with unknown ids and document it in [api.md](api.md)) → order snapshot → `decrementStock` → clear cart → navigate.
4. `/orders` list + `/orders/$orderId` detail (own orders only, else 404), success banner.
5. Tests for CART-5.

**Done when:** a full purchase works end to end; past orders keep their prices after an admin price edit; stock drops after purchase.

## G7 — E2E + polish
**Tasks**
1. Playwright config (Chromium desktop + Pixel 7 viewport), `webServer: pnpm dev`, DummyJSON mocked with `page.route` from the same fixtures.
2. 4 specs from [testing.md](testing.md#e2e-specs).
3. CI job `e2e` (cache browsers, upload report on failure).
4. Run the manual QA checklist; fix a11y (labels, focus rings, dialog focus trap, alt texts), responsive issues, empty/error states.
5. Route-level code splitting (`autoCodeSplitting` in router plugin); check bundle size.

**Done when:** CI green incl. e2e; QA checklist ticked.

## G8 — Deploy + submit
**Tasks**
1. `vercel.json` SPA rewrite (`/(.*) → /index.html`); deploy from GitHub; set `VITE_API_BASE_URL`.
2. README: live link, screenshots (desktop + mobile, light + dark), demo accounts, features list, AI workflow section, "Known limitations" (DummyJSON writes are simulated → local overlay).
3. Final review pass: remove dead code, TODOs, console logs; check commit history reads cleanly.

**Done when:** live link works on a phone; README is complete; repo submitted.

---

## Lead-agent prompt template (one per gate)
```text
You are the lead developer on ays-case. Read AGENTS.md and docs/ first.
Implement gate <Gx> exactly as written in docs/implementation-plan.md.
Follow docs/conventions.md and docs/data-and-state.md; don't change docs unless a task says so —
if something in the docs is wrong or blocks you, stop and report it instead of improvising.
Write the tests listed for this gate. Finish with: pnpm lint && pnpm typecheck && pnpm test (all green),
then a handoff summary: what you did, files changed, decisions made, anything left open.
```

## Cut list (if the deadline is tight, drop in this order)
1. EX-13 dashboard stats, EX-15 reset (keep the overlay `reset()` for tests)
1. USER-3 edit form (keep list/create/delete), PDP-5 similar carousel, PDP-6 sticky bar
2. EX-12 shop table view
3. Playwright (keep Vitest integration tests)
4. TR/EN (ship EN or TR only, keep i18n wiring)
5. Order detail page (keep list)

## Open questions
- Deadline and how to submit (repo link? live link? both?)
- UI language default: TR or EN? (plan assumes TR)

**Resolved:** repo/app name is `ays-case`; admins can shop; `moderator` has no special behaviour.
