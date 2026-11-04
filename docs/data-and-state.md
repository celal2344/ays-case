# Data and state

Our API serves the catalog and users read-only; it has no product or user writes yet (see [api.md](api.md)). So the app has two sources: the remote catalog (read-only truth) and a local **overlay** of the admin's changes. This doc defines who owns what. Decision record: [ADR-0003](decisions/0003-query-plus-zustand-overlay.md).

## Ownership table

| Data                                                     | Owner                                     | Persisted                                      | Key                           |
| -------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------- | ----------------------------- |
| Remote catalog (all products, list fields)               | TanStack Query `productKeys.catalog()`    | no (memory, `staleTime: Infinity` per session) | —                             |
| Product detail (images, reviews)                         | TanStack Query `productKeys.detail(id)`   | no                                             | —                             |
| Categories                                               | TanStack Query `productKeys.categories()` | no                                             | —                             |
| Admin changes (created / patched / deleted)              | `useProductOverlayStore` (Zustand)        | yes                                            | `ays-case:v1:product-overlay` |
| Admin user changes (created / patched / deleted)         | `useUserOverlayStore` (Zustand)           | yes                                            | `ays-case:v1:user-overlay`    |
| Reviews | TanStack Query: part of the product detail (`productKeys.detail(id)`) | no, on the server | — |
| Remote users (admin list)                                | TanStack Query `userKeys.list()`          | no                                             | —                             |
| Current user (the session cookie is owned by the server) | `useAuthStore`                            | no, restored by `bootstrap()`                  | —                             |
| Cart, favorites, recently viewed (signed in) | TanStack Query (`cartKeys`, `favoriteKeys`, `recentlyViewedKeys`) | no, on the server per user | — |
| Recently viewed (signed out) | `useGuestViewedStore` (Zustand) | no, memory only | — |
| Orders | TanStack Query (`orderKeys`) | no, on the server per user | — |
| Theme, language, shop view (grid/table)                  | `usePreferencesStore`                     | yes                                            | `ays-case:v1:prefs`           |
| List filters (q, category, sort, order, page)            | URL search params (TanStack Router)       | in URL                                         | —                             |
| Form drafts, dialogs                                     | component state                           | no                                             | —                             |

Rule of thumb: **if it came from the server, it's Query; if the user made it, it's Zustand; if it should be shareable/back-button-able, it's the URL.**

All persisted stores use `persist` with `version` + `migrate`, and keys built by `lib/storage.ts` so a schema change bumps `v1 → v2` cleanly. User ids are the API's strings (`user-<n>`); browser data saved under the old numeric ids simply never matches them.

## Product overlay

```ts
// features/products/overlay-store.ts
type ProductPatch = Partial<Omit<Product, "id">>;

interface ProductOverlayState {
  created: Record<number, Product>; // admin-created, full objects
  patched: Record<number, ProductPatch>; // edits to remote products
  deleted: number[]; // ids hidden from every view
  nextLocalId: number; // starts at 100_000
  create(input: ProductInput, remoteEcho?: Product): Product;
  update(id: number, patch: ProductPatch): void;
  remove(id: number): void;
  decrementStock(
    lines: { id: number; quantity: number; stock: number }[],
  ): void; // stock = current merged stock
  reset(): void;
}
```

### Why local ids

The API has no product writes, so created products get their own id from `nextLocalId` (≥ 100000, never clashes with real ids). `isLocal(id) = id >= 100_000`. Created users get `local-<n>` ids.

### Merge (single function, pure, unit-tested)

```ts
// features/products/catalog.ts
export function applyOverlay(remote: Product[], o: OverlaySnapshot): Product[] {
  const hidden = new Set(o.deleted);
  const merged = remote
    .filter((p) => !hidden.has(p.id))
    .map((p) => (o.patched[p.id] ? { ...p, ...o.patched[p.id] } : p));
  const local = Object.values(o.created)
    .filter((p) => !hidden.has(p.id))
    .map((p) => (o.patched[p.id] ? { ...p, ...o.patched[p.id] } : p));
  return [...local, ...merged]; // newest local first
}
```

`useCatalog()` = `useQuery(catalogQuery)` + `useProductOverlayStore(selectSnapshot)` → `useMemo(applyOverlay)`. Every list, the detail page, the cart and checkout read through this, so an edit or delete shows up everywhere at once.

Detail page: `useProduct(id)` → local product if `isLocal(id)`; else `useQuery(detail)` then apply `patched[id]`; `deleted` → 404 page.

### Mutations

| Action        | Network                                           | Store                                    | Query cache                                  |
| ------------- | ------------------------------------------------- | ---------------------------------------- | -------------------------------------------- |
| Create        | `POST /products/add` (validates shape, gets echo) | `create()` with local id                 | none needed (overlay re-merges)              |
| Update remote | `PUT /products/{id}`                              | `update(id, patch)`                      | none: `useProduct` applies the patch on read |
| Update local  | none (would 404)                                  | `update(id, patch)`                      | —                                            |
| Delete remote | `DELETE /products/{id}`                           | `remove(id)`                             | `removeQueries(detail(id))`                  |
| Delete local  | none                                              | `remove(id)` (also drops from `created`) | —                                            |

Admin mutations write the overlay only; no request is sent. When the API gains write endpoints, the mutation hooks call them first and write the overlay after they succeed.

## Catalog loading: why fetch everything once

The catalog has ~194 products. We load `GET /api/products` once (through the typed client) and do search / filter / sort / paginate on the merged list in memory. Reason: with server-side pagination, local creates/deletes would break page counts and totals. ADR: [0004](decisions/0004-client-side-catalog.md).

The list carries the fields the cards and filters need; the detail (`GET /api/products/:id`) adds images, sku, dimensions, policies, reviews and the rating histogram. The UI uses the API's own types from `@ays/validators` (no second interface, no mapper): money stays in integer cents and is formatted at render time with `formatMoney`, and grams and millimetres are formatted with `formatWeight` and `formatDimensions`. `rating`, `reviewCount`, `availability` and the histogram are computed by the API in SQL and never derived in the browser (a product without reviews has `rating: null`).

Filtering pipeline (pure, unit-tested): `applyOverlay → filterByQuery(q) → filterByCategory → sortBy → paginate`. Search matches title, brand, category, tags (case-insensitive, Turkish-safe with `toLocaleLowerCase("tr")` only when lang = tr).

## User overlay

Same pattern as products, for the admin Users panel (USER-1..5). The user list comes from `GET /api/users` (admin only); there are no user writes yet, so every admin change is kept locally.

```ts
// features/users/overlay-store.ts
interface UserOverlayState {
  created: Record<number, User>;
  patched: Record<number, Partial<Omit<User, "id">>>;
  deleted: number[];
  nextLocalId: number; // starts at 100_000
  create(input: UserInput): User;
  update(id: number, patch: UserPatch): void;
  remove(id: number): void;
  reset(): void;
}
// features/users/catalog.ts — pure, unit-tested
export function applyUserOverlay(
  remote: User[],
  o: UserOverlaySnapshot,
): User[];
```

- `useUsers()` = `useQuery(GET /users?limit=0)` + overlay → `useMemo(applyUserOverlay)`; search / role filter / pagination run client-side like the catalog.
- On login (and bootstrap) the overlay patch for the user's id is applied on top of `/auth/me`, so an admin's role edit affects that user on this browser. The auth store keeps the merged user.
- Guardrails (in the mutation hooks, tested): cannot delete or demote yourself; cannot delete or demote the last admin (counted over the merged list).
- Deleting a user in the overlay changes nothing on the server; the database cascade removes a real user's cart, favorites and recently viewed. Orders remain.
- Usernames are unique case-insensitively across the merged list.

## Reviews

Reviews are real: they live in the database, one per user per product, and come with the product detail (`reviews[]`: `id, rating, comment, createdAt, author, verifiedBuyer`).

- Create, edit and delete go through the API (`features/reviews/api.ts`, `useReviewMutations`). The rules are shared (`REVIEW_LIMITS` in `@ays/validators`): rating 1 to 5, comment 10 to 500 characters. A second review by the same user is refused with `409 review_exists`; an author edits and deletes their own review, an admin can delete any.
- The headline rating, count and 1 to 5 histogram are computed by the database (`product_rating_stats`), so after each change the product detail and the catalog list are refetched; nothing is averaged in the browser.
- `verifiedBuyer` is computed in SQL (the author has an order line for the product) and is not required to review.
- `features/reviews/sort.ts` (pure) only sorts the list for display.
- Deleting a product in the admin overlay does not touch reviews on the server.

## Auth store

```ts
interface AuthState {
  user: User | null; // from the Better Auth session, includes role
  status: "idle" | "restoring" | "authenticated" | "anonymous";
  bootstrap(): Promise<void>; // idempotent
  login(username: string, password: string): Promise<User>;
  logout(): void; // also queryClient.clear() and ends the server session
  expire(): void; // the API answered 401 while signed in: clear, toast, go to /login
}
// selectors
export const selectIsAdmin = (s: AuthState) => s.user?.role === "admin";
```

Nothing is persisted: the session is an HttpOnly cookie, and `bootstrap()` asks the server who is signed in (`status` always starts `idle`). Login is by username through `authClient`.

## Cart, favorites and recently viewed (server)

These live in the database per user and are read through TanStack Query (`features/cart`, `features/favorites`, `features/recently-viewed`, each with `api.ts`, `queries.ts` and hooks). Every endpoint needs a session and is scoped to it: no user id is ever sent. Signed-out visitors see an empty cart and favorites and the existing "sign in" prompts; a click while signed out is remembered (`pending-action`) and applied after login.

```ts
// cart line: ids and a quantity only; prices and titles come from useCatalog() at render time
interface CartLine { productId: number; quantity: number; addedAt: string }
```

- `useCart()` returns `lines`, `count`, `add`, `setQuantity`, `remove`, `clear`. `useFavorites()` / `useToggleFavorite()` and `useRecentlyViewed()` / `useRecordView()` keep their shape.
- **Optimistic updates** (`lib/optimistic.ts`): the cached list changes at once, is rolled back with a toast if the request fails, and is refetched when the last in-flight mutation on that key settles.
- Quantity rule: a whole number from 1 to the stock. The server caps an add and clamps a set; the UI computes the same value locally for the optimistic update and uses the merged stock (admin edits).
- Lines whose product no longer exists in the merged catalog are removed (server delete) and a toast tells the user once.
- Products created in the admin overlay have no server record, so they cannot be added to the cart yet (a toast says so).
- Recently viewed keeps the newest 12 per user (`MAX_RECENTLY_VIEWED`). Signed out, a small in-memory store keeps the list; it is never persisted or merged on login.
- Checkout reads the cart from the query cache and empties it on the server after the (still local) order is recorded.
- Totals selector: subtotal, discount (`discountPercentage`), total, in integer cents.

## Orders and checkout (server)

Orders live in the database per user and are read through TanStack Query (`features/orders`: `api.ts`, `queries.ts`, `useOrders`, `useOrder`). `Order`, `OrderLine` and the shipping rules come from `@ays/validators`.

```ts
interface Order {
  id: string // uuid
  userId: string // Better Auth user id, e.g. user-16
  createdAt: string
  lines: { productId: number | null; title: string; thumbnail: string | null; listCents: number; unitCents: number; discountPercentage: number; quantity: number }[]
  totals: { subtotalCents: number; discountCents: number; totalCents: number }
  shipping: { fullName: string; address: string; city: string; phone: string }
}
```

Lines are a **snapshot** (title and prices at purchase time): later product edits never change past orders. `productId` becomes null only if the product is hard-deleted.

### Checkout

`POST /orders` takes only `{ shipping }`. In one transaction the server locks the cart's products, checks stock against its own catalog, prices the lines (`salePriceCents`), stores the order, takes the stock with a guarded update and empties the cart; any refusal changes nothing. The page keeps computing totals for display, and the confirmation and order pages show the server's numbers.

1. The form validates with the shared `shippingSchema`; the submit button is disabled while the request is pending.
2. On success the cart, orders, catalog and product-detail queries are invalidated (stock changed) and the app opens `/orders/$orderId?placed=1`.
3. Refusals are explained by the API's error `code`: `cart_empty`, `insufficient_stock` and `product_unavailable` (`errorCodeKey` in `lib/error-message.ts`); the server's message also names the product.

## Query keys

```ts
export const productKeys = {
  all: ["products"] as const,
  catalog: () => [...productKeys.all, "catalog"] as const,
  details: () => [...productKeys.all, "detail"] as const,
  detail: (id: number) => [...productKeys.details(), id] as const,
  categories: () => [...productKeys.all, "categories"] as const,
};
export const authKeys = { me: () => ["auth", "me"] as const };
export const userKeys = {
  all: ["users"] as const,
  list: () => [...userKeys.all, "list"] as const,
};
```

Factory pattern copied from StokMate `packages/domain/src/query-keys.ts`.

## Reset demo data (EX-15)

Admin dashboard button → `overlay.reset()`, `userOverlay.reset()`, `search.reset()` → confirm dialog first. Everything on the server (cart, favorites, recently viewed, orders, reviews) is not touched.
