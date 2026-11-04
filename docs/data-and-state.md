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
| Reviews written in the app                               | `useReviewsStore` (Zustand)               | yes                                            | `ays-case:v1:reviews`         |
| Remote users (admin list)                                | TanStack Query `userKeys.list()`          | no                                             | —                             |
| Current user (the session cookie is owned by the server) | `useAuthStore`                            | no, restored by `bootstrap()`                  | —                             |
| Cart                                                     | `useCartStore`                            | yes, per user                                  | `ays-case:v1:cart`            |
| Orders                                                   | `useOrdersStore`                          | yes, per user                                  | `ays-case:v1:orders`          |
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
| Delete (any)  | —                                                 | `cartStore.removeProductEverywhere(id)`  | —                                            |

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
- Deleting a user also calls `cart.clear(userId)`; orders remain.
- Usernames are unique case-insensitively across the merged list.

## Reviews

- Reviews come from `GET /api/products/:id` (`reviews[]`: `id, rating, comment, createdAt, author`). The headline rating, count and histogram also come from the API, so a review written only in this browser appears in the list but does not move them.
- `useReviewsStore`: `byProduct: Record<number, LocalReview[]>` with `LocalReview { id, productId, userId, authorName, rating, comment, createdAt }`; actions `add`, `update`, `remove`, `removeProduct`, `reset`. One review per user per product.
- `features/reviews/merge.ts` (pure): `mergeReviews(seeded, local)` and `sortReviews`. Nothing averages ratings on the client.
- Verified buyer: author has an order containing the product (selector over the orders store).
- Deleting a product also calls `reviews.removeProduct(id)`. Reset demo data clears this store.

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

## Cart store

```ts
interface CartLine {
  productId: number;
  quantity: number;
  addedAt: string;
}
interface CartState {
  byUser: Record<number, CartLine[]>;
  add(userId: number, productId: number, qty: number, stock: number): number; // capped at stock, returns the new line quantity
  setQuantity(
    userId: number,
    productId: number,
    qty: number,
    stock: number,
  ): number; // clamped to 1…stock
  remove(userId: number, productId: number): void;
  clear(userId: number): void;
  removeProductEverywhere(productId: number): void;
}
```

- Lines store only id + quantity; price/title come from `useCatalog()` at render time, so admin price edits show in the cart. Lines whose product no longer exists are dropped by a selector and a toast tells the user once.
- Quantity clamp: `1 ≤ qty ≤ product.stock` (current merged stock).
- Hooks `useCart()` bind the current `user.id` so components never pass it.
- Totals selector: subtotal, discount (`discountPercentage`), total — computed with integer cents to avoid float drift.

## Orders store

```ts
interface Order {
  id: string; // crypto.randomUUID()
  userId: string; // Better Auth user id, e.g. user-16
  createdAt: string;
  lines: {
    productId: number;
    title: string;
    thumbnail: string;
    unitPrice: number;
    quantity: number;
    discountPercentage: number;
  }[];
  totals: { subtotal: number; discount: number; total: number };
  shipping: { fullName: string; address: string; city: string; phone: string };
}
```

Lines are a **snapshot** (title/price at purchase time) — later admin edits must not change past orders.

## Checkout sequence

1. Validate cart lines against merged stock (abort with a message if a line exceeds stock).
2. No request is made: the API has no checkout yet. Totals are computed by us from merged prices.
3. `ordersStore.add(order)` → `overlay.decrementStock(lines)` → `cart.clear(userId)`.
4. Navigate to `/orders/$orderId?placed=1` (success banner).

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

Admin dashboard button → `overlay.reset()`, `userOverlay.reset()`, `reviews.reset()`, `orders.reset()`, all carts cleared → confirm dialog first.
