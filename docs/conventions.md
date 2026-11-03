# Conventions

Most of these are lifted from **StokMate** (`celal2344/stokmate`, Aug 2026: React 19, Vite, TanStack Router/Query/Form/Table, shadcn, Tailwind 4, Zod, i18next). Where this project differs, the reason is noted.

## Carried over from StokMate
| Practice | StokMate source | Here |
|---|---|---|
| pnpm with pinned version (`packageManager`, `engines`) | root `package.json` | same, single package |
| Exact dependency versions (no `^`) | `apps/web/package.json` | same |
| Prettier + `prettier-plugin-tailwindcss` with `tailwindFunctions: ["cn","cva"]` | `prettier.config.mjs` | same |
| ESLint flat config + `typecheck` script (`tsc --noEmit`) | `packages/eslint-config` | same, inlined |
| TanStack file-based routes, `routeTree.gen.ts` committed | `apps/web/src/routes` | same |
| Pathless auth layout route with `beforeLoad` + `redirect({ search: { redirect } })` | `_authenticated.tsx` | `_auth.tsx` + nested `_admin.tsx` |
| Router context carries `auth` (+ `queryClient`) | `router-context.ts` | same |
| Idempotent session restore promise | `auth.tsx` `ensureRestored()` | `authStore.bootstrap()` |
| Single-flight token refresh, retry once on 401, then invalidate session | `api-client/src/client.ts` | axios interceptor in `lib/http.ts` |
| Normalized API error class | `api-error.ts` | `AppError` with `kind` |
| Query-key factory (`all → lists → list(filters)`, `details → detail(id)`) | `domain/src/query-keys.ts` | `features/products/query-keys.ts` |
| Feature folders (`features/products/...`) | `apps/web/src/features` | same, more features |
| shadcn `components/ui` untouched, `cn()` in `lib/utils.ts` | `components/ui`, `lib/utils.ts` | same |
| URL-synced list state (search/filter/sort/page) | product list | same, Zod-validated search params |
| Loading / error / empty states on every list | README features | same ([routes-and-pages](routes-and-pages.md)) |
| i18next TR/EN + translation-parity script | `scripts/check-translation-parity.mjs` | same, run in CI |
| Light/dark/system theme + language controls | `preferences.tsx`, `preferences-controls.tsx` | Zustand `preferences` store |
| `AGENTS.md` + `docs/` for agents | repo root | same |
| README: screenshots, AI workflow, setup, test account, features | `README.md` | same structure |
| CI on PR | `.github/workflows/ci.yml` | lint, typecheck, test, build, e2e |

## Different from StokMate (and why)
- **No monorepo / Turborepo** — one app, nothing to share.
- **Axios instead of fetch** — required by the brief.
- **Zustand for auth instead of a class + `useSyncExternalStore`** — brief requires a store; Zustand's `getState()` gives the same "readable outside React" property the class had.
- **Hand-written Zod schemas instead of Orval** — the DummyJSON OpenAPI spec (`dummyjson.json`) has no `required` lists or enums, so schemas are written by hand from it.
- **Client-side filtering** — StokMate's API did server-side pagination; here the overlay forces client-side ([ADR-0004](decisions/0004-client-side-catalog.md)).
- **No SignalR / no mobile** — not in scope.

## Naming
- Files: `kebab-case.tsx`. Components: `PascalCase`. Hooks: `use-*.ts` exporting `useX`.
- Stores: `features/<f>/store.ts` exporting `useXStore`; selectors as named functions `selectX`.
- API functions: verb + noun, `getCatalog`, `getProduct`, `createProduct`, `updateProduct`, `deleteProduct`, `loginRequest`.
- Zod: `productSchema`, type `Product = z.infer<typeof productSchema>`; form schemas `productFormSchema`.
- i18n keys: `feature.area.key` (`cart.summary.total`).

## TypeScript
- `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` off (pain with forms).
- No `any`, no non-null `!` except in tests. `satisfies` for config objects.
- Path alias `@/` → `src/`.

## React
- Routes are thin: validate search, prefetch in `loader` (`queryClient.query`), render a page component from `features/`.
- Zustand selectors always (`useCartStore(selectCount)`), never the whole store, to avoid re-renders. `useShallow` for object selectors.
- Derived data via `useMemo` over pure functions in `*.ts` files (testable without React).
- No `useEffect` for data fetching or derived state.
- Money: store as numbers from API, compute totals in cents, format with `Intl.NumberFormat(lang, { style: "currency", currency: "USD" })`.

## Styling
- Tailwind utilities + shadcn tokens (`bg-background`, `text-muted-foreground`). No raw hex in components.
- Mobile-first; breakpoints `sm md lg xl` only.
- Icons: lucide, `size-4` default.

## Git
- Conventional commits: `feat(cart): quantity stepper`, `fix(auth): refresh loop`, `docs:`, `test:`, `chore:`.
- One gate = one PR (or a small set of commits on main if working solo); every gate ends green on lint, typecheck, test.
- Never commit `.env*` except `.env.example`.

## Tooling notes (from G0)
- **TypeScript is pinned to 6.x**: `typescript-eslint` does not support TS 7 yet, and ESLint is required by the lint setup. Revisit when it does.
- **shadcn is kept exactly as generated** (current default style `base-nova` on Base UI, `cn` re-exported from the `cn` package, `next-themes` used by sonner until G1). `components/ui` is generated and excluded from lint and Prettier; do not hand-edit it, regenerate with the shadcn CLI.
- **Versions:** all dependencies are the latest at G0 (checked with `pnpm outdated`), except TypeScript 6.x and `@types/node` 24 (matches the Node 24 engine).
- **Theme uses `next-themes`** (what the generated sonner already reads), storage key `ays-case:v1:theme`; the `preferences` Zustand store holds only language and shop view.
- **Refresh skips only `/auth/login` and `/auth/refresh`** (not every `/auth/*`), so an expired token on `/auth/me` is refreshed during bootstrap. `DEFAULT_LANDING` is `/` until the products route exists (G3).
- **Tests run jsdom at origin `https://dummyjson.com`** so MSW-mocked XHR needs no CORS preflight; MSW 3 uses `onUnhandledFrame`.
- **Catalog schema facts (checked against the live API):** 92 of 194 products have no `brand`, so it is optional; `GET /products?limit=0&select=...` returns all 194; detail 404s are not retried.
- **Search params use `.catch(undefined)`** so a malformed URL falls back to defaults; `undefined` always means default and is stripped from the URL (`search-state.ts`).
- **Session bootstrap runs at startup** (`main.tsx`, non-blocking) so public pages know the signed-in user after a reload; guards still await it on protected routes.
- **Product page extras:** the first breadcrumb crumb is "Products" (the shop list is the home page); the verified-buyer badge reads the orders store (an order containing the product); admins can hide seeded DummyJSON reviews (stored as hidden keys), local reviews can be edited and deleted by their author.
- **Tests stub `ResizeObserver` / `IntersectionObserver` / `scrollIntoView`** in `src/test/setup.ts` (jsdom has none); the sticky-bar test swaps in a controllable observer.
- **Cart behaviour:** the shop card shows "Add to cart" until the product is in the cart, then a quantity stepper (clamped to stock) and a remove button; the cart page rows show only the line total (no "unit × quantity" line). A signed-out "Add to cart" is stored as a pending action and applied after sign-in by `usePendingCartAction` (mounted in the app shell). "Buy now" adds and opens `/checkout`.
- **`QuantityStepper`** (`components/quantity-stepper.tsx`) keeps a typed draft, so the field can be emptied while typing; the value shown is always the clamped one.
- **TanStack Table is v9** (`useTable`, `tableFeatures`, `createSortedRowModel`, `table.FlexRender`), not the v8 API most examples show; the admin table registers sorting + pagination, keeps columns at module scope and lets the URL own both states.
- **Links styled as buttons** use `<Link className={buttonVariants(...)}>`, never `<Button render={<Link/>}>` (Base UI warns and changes the role).
- **Admin writes** (`features/admin/hooks/use-product-mutations.ts`): DummyJSON is called first (skipped for local ids), the overlay is written only on success; detail cache is not patched (the overlay is applied on read, so Reset demo data cannot leave stale data behind). Reset clears the product and user overlays, reviews, carts and orders.
- **Users panel (G5b):** `features/users` mirrors the products overlay (`useUsers` = `GET /users` + `useUserOverlayStore`). Passwords are not managed (sign-in always uses DummyJSON accounts, so a typed password could never be checked); users created in the panel cannot sign in. The overlay patch is applied when a session is created or restored (`users/session.ts`), a user deleted in the panel cannot sign in, and editing your own account updates the header at once. Guardrails (no self-delete/demote, no last-admin removal) are enforced in the mutations and mirrored by disabled controls.
- **Admin menu:** desktop header dropdown (Dashboard / Products / Users); the mobile sheet lists the same links under an "Admin" heading. `useUnsavedChangesGuard` + `UnsavedChangesDialog` are shared by both admin forms.

- **Checkout / orders (G6):** `usePlaceOrder` reads cart, catalog and overlay fresh from the stores, refuses (touching nothing) if any line exceeds current stock, calls `POST /carts/add` for remote ids only (skipped when the cart holds only local products), and only then writes the order, decrements stock and clears the cart. A failed receipt call keeps cart and stock. Orders store money as integer cents and freeze title, thumbnail and prices. `/checkout` redirects an empty cart to `/cart`; another user's order id renders the 404 page. Shipping details are not stored anywhere but in the order.

- **A11y / polish (G7):** the shop card's image link and the cart row's image link are `aria-hidden` and not focusable (the title link next to them is the one link per item). Language toggle names start with the visible code ("TR Türkçe") so voice-control users can say what they see. Light-mode toast colours and `--destructive` are darkened in `index.css` to reach 4.5:1; `src/components/ui/*` stays as generated. The e2e folder has its own `tsconfig.e2e.json` and is linted; `@axe-core/playwright` is a dev dependency for the a11y spec.

- **Marketplace design (issue #14):** light is the first-visit default (dark and system stay available). Tokens live in `index.css`; extra tokens `brand` (decorative orange: logo, underline), `brand-text` (orange text, AA), `brand-soft`, `success`, `star`. Deviations from the issue table, all for WCAG AA (checked by the axe e2e spec in light **and** dark): `primary` is the strong orange `#c2530a` with white text, `muted-foreground` is `#666`, `success` is `#17794a`, prices use `brand-text`. Font is Inter (`@fontsource-variable/inter`, replaces Geist). The header search is the only shop search box (it filters live on `/products`); the list has a left filter panel (category, price, brand, rating; a sheet below lg) whose state is in the URL (`minPrice`, `maxPrice`, `brand`, `rating`) with removable chips. "Free shipping" is a display tag from $50 sale price, not a real shipping rule.

- **Category navigation (issue #22):** the header's second row is a mega-menu (shadcn `NavigationMenu`, desktop lg+), the same groups are an accordion in the menu sheet below lg; no scrolling strip. Grouping is the static map in `features/products/category-groups.ts` (`groupOf`, unknown slugs → "Other"); counts come from the merged catalog, and categories without products or groups without categories are not shown. "View all in <group>" uses a new `?group=<id>` search param (all categories of the group), shown as a removable chip; choosing a single category replaces it.

- **Favorites (issue #24):** `features/favorites` keeps product ids per user (newest first, persisted, `ays-case:v1:favorites`); everything shown comes from the merged catalog, and a product that no longer exists is dropped. The heart is a `aria-pressed` toggle that never triggers the link it sits in. Signed out, it uses the pending-action mechanism (now a union of `add-to-cart` and `favorite`; each hook only consumes its own type). Deleting a product removes it from everyone's favorites; Reset demo data clears them.

- **Search suggestions (issue #31):** the header search is a combobox (shadcn `combobox`, base-ui) with up to 5 products, 3 categories and a "Search for ..." row from the merged catalog (`getSuggestions`, pure and unit tested; 2+ characters, 150 ms debounce). Only Enter or a pick navigates; on `/products` the list still filters live (300 ms), which does not fight the dropdown. It uses base-ui's `inline` mode with our own positioned list because the popup mode marks the rest of the page `aria-hidden` while open (axe `aria-hidden-focus`, and it hides the live results); outside press and blur close it, Escape closes and keeps the text. Focus panel (issue #31, part 2): while the box is focused and empty the same popup shows Recently viewed (store from #32), Recent searches (`features/search/store.ts`, per browser, max 6, recorded only on Enter, the "Search for" row or a recent chip), Suggested searches (most frequent catalog tags, `getSuggestedTags`) and Best deals (`getBestDeals`: in stock, highest discount). Nothing is called popular; every section is derived from local history or the merged catalog and hidden when empty. Below md the open search is a full-screen layer. Reset demo data clears recent searches.
