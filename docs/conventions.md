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
- Routes are thin: validate search, prefetch in `loader` (`queryClient.ensureQueryData`), render a page component from `features/`.
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
- **Product page extras:** the first breadcrumb crumb is "Products" (the shop list is the home page); quantity, Buy now and Add to cart are stubs until G4/G6 (toasts); the verified-buyer check is a stub that returns false until the orders store exists (G6); admins can hide seeded DummyJSON reviews (stored as hidden keys), local reviews can be edited and deleted by their author.
- **Tests stub `ResizeObserver` / `IntersectionObserver` / `scrollIntoView`** in `src/test/setup.ts` (jsdom has none); the sticky-bar test swaps in a controllable observer.
- **Cart behaviour:** the shop card shows "Add to cart" until the product is in the cart, then a quantity stepper (clamped to stock) and a remove button; the cart page rows show only the line total (no "unit × quantity" line). A signed-out "Add to cart" is stored as a pending action and applied after sign-in by `usePendingCartAction` (mounted in the app shell). "Buy now" adds and opens `/cart` until checkout exists (G6).
- **`QuantityStepper`** (`components/quantity-stepper.tsx`) keeps a typed draft, so the field can be emptied while typing; the value shown is always the clamped one.
- **TanStack Table is v9** (`useTable`, `tableFeatures`, `createSortedRowModel`, `table.FlexRender`), not the v8 API most examples show; the admin table registers sorting + pagination, keeps columns at module scope and lets the URL own both states.
- **Links styled as buttons** use `<Link className={buttonVariants(...)}>`, never `<Button render={<Link/>}>` (Base UI warns and changes the role).
- **Admin writes** (`features/admin/hooks/use-product-mutations.ts`): DummyJSON is called first (skipped for local ids), the overlay is written only on success; detail cache is not patched (the overlay is applied on read, so Reset demo data cannot leave stale data behind). Reset clears product overlay, reviews and carts; G5b and G6 add users and orders.
