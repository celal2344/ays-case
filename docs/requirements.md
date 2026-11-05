# Requirements

> **Historical:** written for the DummyJSON-era plan. Where it disagrees with [backend.md](backend.md) and [api.md](api.md), those win.


Source: `Frontend_Case.pdf` (case brief, Turkish). Each requirement has an ID used in the [tests](testing.md). **MUST** = in the brief. **EXTRA** = bonus ("ek geliştirmeler artı puan").

## 1. Mandated tech

| ID  | Requirement                                         | Our choice                                                 |
| --- | --------------------------------------------------- | ---------------------------------------------------------- |
| T-1 | React or Vue 3 (Composition API)                    | React 19 + Vite + TypeScript                               |
| T-2 | Tailwind CSS                                        | Tailwind 4                                                 |
| T-3 | Optional UI library (shadcn, Radix, Headless UI, …) | shadcn/ui (Radix primitives)                               |
| T-4 | Axios                                               | Single axios instance in `apps/web/src/lib/http.ts`        |
| T-5 | Zustand or Pinia                                    | Zustand (auth, cart, orders, product overlay, preferences) |

## 2. Authentication

| ID               | Requirement                                   | Acceptance criteria                                                                                                                                                                                                                |
| ---------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AUTH-1           | Login via a simple form                       | `/login` has username + password fields, Zod validation, submit shows loading, errors shown inline/toast                                                                                                                           |
| AUTH-2           | No real password check; dummy user validation | Login calls DummyJSON `POST /auth/login` with a DummyJSON user. "Fill admin / Fill user" buttons pre-fill working demo accounts so nobody has to know passwords                                                                    |
| AUTH-3           | Login unlocks some routes                     | After login the user is redirected to `?redirect=` target or `/products`                                                                                                                                                           |
| AUTH-4           | Not logged in → no access to protected pages  | Visiting `/cart`, `/checkout`, `/orders`, `/admin/*` while logged out redirects to `/login?redirect=<path>`                                                                                                                        |
| AUTH-5           | Logout                                        | Header menu → Logout clears tokens, user, and in-memory query cache; redirects to `/login`                                                                                                                                         |
| AUTH-6           | Login state survives refresh (localStorage)   | Tokens + user persisted; on boot `/auth/me` validates the token; expired → refresh → any remaining failure logs out. A session that dies mid-use is handled by the route guard on the next navigation                              |
| AUTH-7 (derived) | Admin vs user                                 | Role comes from DummyJSON `user.role`. `admin` → admin routes; every other role (`user`) → shop only. Non-admin on `/admin/*` → `/forbidden`. Admins can also shop (cart, checkout, orders) |

## 3. Products

| ID     | Requirement                  | Acceptance criteria                                                                                                                                                                   |
| ------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PROD-1 | Products come from DummyJSON | Catalog loaded from `GET /products`                                                                                                                                                   |
| PROD-2 | Admin lists products         | `/admin/products`: table with thumbnail, title, category, price, stock, actions                                                                                                       |
| PROD-3 | Admin adds product           | Form (title, description, category, brand, price, discount %, stock, thumbnail URL). Calls `POST /products/add`, product then appears everywhere (shop list too) and survives refresh |
| PROD-4 | Admin updates product        | Edit form pre-filled; `PUT /products/{id}`; change visible everywhere, survives refresh                                                                                               |
| PROD-5 | Admin deletes product        | Confirm dialog; `DELETE /products/{id}`; product disappears everywhere, removed from carts; survives refresh                                                                          |
| PROD-6 | User lists products          | `/products`: responsive card grid                                                                                                                                                     |
| PROD-7 | User adds to cart            | "Add to cart" on card and detail; disabled when out of stock; toast feedback                                                                                                          |
| PROD-8 | User buys products           | Checkout flow creates an order (see CART-4)                                                                                                                                           |
| PROD-9 | Card or table view           | Shop = cards, admin = table (EXTRA: shop has a card/table toggle)                                                                                                                     |

### Product detail (Trendyol-style layout)

| ID    | Requirement           | Acceptance criteria                                                                                                |
| ----- | --------------------- | ------------------------------------------------------------------------------------------------------------------ |
| PDP-1 | Breadcrumb            | Home › category › title; each crumb links to the filtered list                                                     |
| PDP-2 | Gallery               | Main image + thumbnail strip, click to zoom (dialog), keyboard accessible                                          |
| PDP-3 | Price block           | Current price, struck old price, discount badge, "only N left" at stock ≤ 5, out-of-stock state                    |
| PDP-4 | Buy now + Add to cart | Quantity stepper clamped to stock; Buy now = add + navigate to `/checkout`; logged-out → login with pending action |
| PDP-5 | Similar products      | Carousel of same-category products from the merged catalog, excluding the current one                              |
| PDP-6 | Sticky add-to-cart    | Bar appears after the main buttons scroll out of view; bottom bar on mobile                                        |

### Reviews

| ID    | Requirement              | Acceptance criteria                                                                                                     |
| ----- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| REV-1 | List reviews             | DummyJSON `reviews[]` from `GET /products/{id}` plus local reviews, newest first, sortable by newest / highest / lowest |
| REV-2 | Rating summary           | Average and 5→1 star histogram computed from seeded + local reviews                                                     |
| REV-3 | Add review               | Logged-in user, 1–5 stars + text (10–500), one review per user per product, stored locally, survives refresh            |
| REV-4 | Edit / delete own review | Author can edit or delete; admin can delete any                                                                         |
| REV-5 | Verified buyer           | Badge when the author has an order containing the product                                                               |

## 4. Cart

| ID               | Requirement           | Acceptance criteria                                                                                                                                                             |
| ---------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CART-1           | Add products to cart  | Adding an existing item increments its quantity                                                                                                                                 |
| CART-2           | Update quantity       | Stepper; min 1, max = stock; typing is clamped                                                                                                                                  |
| CART-3           | Remove item           | Remove button + "clear cart"                                                                                                                                                    |
| CART-4           | Cart lives in a store | Zustand store, persisted per user id                                                                                                                                            |
| CART-5 (derived) | Purchase              | `/checkout`: summary + shipping form → `POST /carts/add` (DummyJSON computes totals) → order saved to orders store → stock decremented in overlay → cart cleared → success page |

## 4b. Admin: users

| ID     | Requirement        | Acceptance criteria                                                                                                                                                                                                              |
| ------ | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| USER-1 | Admin lists users  | `/admin/users`: table (avatar, name, username, email, role) with search, role filter, pagination 20; data from `GET /users` merged with the user overlay                                                                         |
| USER-2 | Admin adds user    | Form (username, first/last name, email, role; no password: sign-in always uses DummyJSON accounts, so users created here cannot sign in). `POST /users/add` (simulated) then stored in the user overlay with a local id ≥ 100000 |
| USER-3 | Admin edits user   | `PUT /users/{id}` (simulated; skipped for local ids), patch stored in the overlay. DummyJSON accepts `role` but does not persist it, so role edits live only in the overlay                                                      |
| USER-4 | Admin deletes user | Confirm dialog; hidden everywhere; the user's cart is dropped, past orders stay as history                                                                                                                                       |
| USER-5 | Guardrails         | Cannot delete or demote yourself; cannot remove or demote the last admin; the overlay patch is applied on top of `/auth/me` on login so edits take effect on this browser                                                        |

## 5. Non-functional

| ID   | Requirement                                | Acceptance criteria                                                                                                              |
| ---- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| NF-1 | No real backend; data in local state/store | All writes end in Zustand (persisted). DummyJSON write calls are made for realism but their result is not trusted as persistence |
| NF-2 | Responsive                                 | Works at 360px, 768px, 1280px+. Mobile nav in a sheet; tables scroll or collapse to cards                                        |
| NF-3 | Code quality + structure                   | Feature folders, strict TS, ESLint + Prettier, no `any`, see [conventions](conventions.md)                                       |
| NF-4 | AI use is allowed but judged               | README "AI workflow" section; no dead/generated noise in the repo; every gate reviewed by hand                                   |
| NF-5 | Loading / error / empty states everywhere  | Skeletons, error with retry, empty illustrations/text                                                                            |

## 6. Extras (all planned)

| ID    | Extra                       | Notes                                                                       |
| ----- | --------------------------- | --------------------------------------------------------------------------- |
| EX-1  | Search                      | Debounced, URL-synced `?q=`                                                 |
| EX-2  | Category filter             | From `GET /products/categories` (+ categories of local products)            |
| EX-3  | Sort                        | price / rating / title, asc/desc, `?sort=price&order=asc`                   |
| EX-4  | Pagination                  | Page size 12 (shop) / 20 (admin), `?page=`                                  |
| EX-5  | Product detail page         | Images gallery, specs, reviews (from DummyJSON), add to cart                |
| EX-6  | Order history               | `/orders` list + `/orders/$orderId` detail, per user                        |
| EX-7  | Dark mode                   | light / dark / system, persisted                                            |
| EX-8  | TR / EN                     | i18next, translation-parity check script (as in StokMate)                   |
| EX-9  | Tests                       | Vitest + RTL + MSW for units/integration, Playwright e2e for the main flows |
| EX-10 | CI                          | GitHub Actions: lint, typecheck, test, build, e2e                           |
| EX-11 | Deploy                      | Vercel, SPA rewrite, live link in README                                    |
| EX-12 | Card / table toggle on shop | `?view=grid                                                                 | table` |
| EX-13 | Admin dashboard stats       | Product count, low-stock count, orders count (local)                        |
| EX-14 | Low-stock / discount badges | From `stock` and `discountPercentage`                                       |
| EX-15 | Reset demo data             | Admin button: clears overlay + orders (handy for evaluators)                |

## 7. Out of scope

- Real payments, public self-registration, password reset (admin-managed users are overlay-only, see USER-*)
- Server-side persistence of anything
- SSR / Next.js
