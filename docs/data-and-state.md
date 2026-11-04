# Data and state

Everything the shop and the admin pages show comes from our API ([api.md](api.md)), including the admin's product, lookup and user writes. The browser keeps no copy of server data beyond the Query cache. This doc defines who owns what. The overlay described in [ADR-0003](decisions/0003-query-plus-zustand-overlay.md) and [ADR-0006](decisions/0006-user-management-overlay.md) was removed when the admin CRUD moved to the API.

## Ownership table

| Data                                                     | Owner                                     | Persisted                                      | Key                           |
| -------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------- | ----------------------------- |
| Remote catalog (all products, list fields)               | TanStack Query `productKeys.catalog()`    | no (memory, `staleTime: Infinity` per session) | —                             |
| Product detail (images, reviews)                         | TanStack Query `productKeys.detail(id)`   | no                                             | —                             |
| Categories                                               | TanStack Query `productKeys.categories()` | no                                             | —                             |
| Reviews | TanStack Query: part of the product detail (`productKeys.detail(id)`) | no, on the server | — |
| Users (admin list)                                       | TanStack Query `userKeys.list()`          | no                                             | —                             |
| Admin product list (soft-deleted included), lookups      | TanStack Query (`useAdminProducts`, `['admin', 'lookups', kind]`) | no | — |
| Current user (the session cookie is owned by the server) | `useAuthStore`                            | no, restored by `bootstrap()`                  | —                             |
| Cart, favorites, recently viewed (signed in) | TanStack Query (`cartKeys`, `favoriteKeys`, `recentlyViewedKeys`) | no, on the server per user | — |
| Recently viewed (signed out) | `useGuestViewedStore` (Zustand) | no, memory only | — |
| Orders | TanStack Query (`orderKeys`) | no, on the server per user | — |
| Theme, language, shop view (grid/table)                  | `usePreferencesStore`                     | yes                                            | `ays-case:v1:prefs`           |
| List filters (q, category, sort, order, page)            | URL search params (TanStack Router)       | in URL                                         | —                             |
| Form drafts, dialogs                                     | component state                           | no                                             | —                             |

Rule of thumb: **if it came from the server, it's Query; if the user made it, it's Zustand; if it should be shareable/back-button-able, it's the URL.**

All persisted stores use `persist` with `version` + `migrate`, and keys built by `lib/storage.ts` so a schema change bumps `v1 → v2` cleanly. User ids are the API's strings (`user-<n>`); browser data saved under the old numeric ids simply never matches them.

## Admin writes

The API owns every write, so there is no local overlay: the admin pages call the API and the catalog, detail and admin queries are refetched afterwards. The server enforces the rules (see [api.md](api.md)); the UI only mirrors the ones it can know up front, for example it disables Delete on your own row.

### Products

- `GET /api/admin/products` lists every product, soft-deleted ones included (`deletedAt`); the table hides them unless `?deleted=include|only`. The public list and detail never contain deleted products.
- Create, edit, delete (soft) and restore go through `features/admin/api.ts` and the hooks in `features/admin/hooks/use-product-mutations.ts`. The form collects dollars, kilograms and centimetres and converts once in `toProductBody` (cents, grams, millimetres). Tags and images, when sent, replace the old sets; the array order of the images is their position and one of them is primary.
- After any product write the whole `productKeys.all` prefix is invalidated (shop list, details, admin list); after a delete the cart, favorites and recently viewed queries are refetched too, because the server removes the product from them.
- Brands, tags, categories and the three policy tables are managed on `/admin/lookups/$kind`; their lists are Query keys `['admin', 'lookups', kind]` and are refetched after each write. A row that products still use cannot be deleted (409 `in_use`).

## Catalog loading: why fetch everything once

The catalog has ~194 products. We load `GET /api/products` once (through the typed client) and do search / filter / sort / paginate on that list in memory. Reason: the catalog is small, and one request keeps the filters instant and the page counts exact. ADR: [0004](decisions/0004-client-side-catalog.md).

The list carries the fields the cards and filters need; the detail (`GET /api/products/:id`) adds images, sku, dimensions, policies, reviews and the rating histogram. The UI uses the API's own types from `@ays/validators` (no second interface, no mapper): money stays in integer cents and is formatted at render time with `formatMoney`, and grams and millimetres are formatted with `formatWeight` and `formatDimensions`. `rating`, `reviewCount`, `availability` and the histogram are computed by the API in SQL and never derived in the browser (a product without reviews has `rating: null`).

Filtering pipeline (pure, unit-tested): `filterByQuery(q) → filterByCategory → sortBy → paginate`. Search matches title, brand, category, tags (case-insensitive, Turkish-safe with `toLocaleLowerCase("tr")` only when lang = tr).

## Users

The Users panel (USER-1..5) calls the API; there is no local copy of the user list.

- `useUsers()` is `useQuery(GET /api/users)` (admin only); search, role filter and paging run client-side on that list.
- Create sends an initial password, which the server hashes; the new user can sign in right away. Update patches names, email, username and role. Delete removes the user, and the database cascade removes their cart, favorites and recently viewed; orders remain.
- The server owns the guards and answers 409 with a code: `cannot_delete_self`, `cannot_demote_self`, `last_admin`, `duplicate`. The UI also disables Delete on your own row and locks the role select on your own account; `userErrorText` turns the codes into messages.
- Usernames are unique case-insensitively; the form checks the loaded list as you type and the server has the last word.
- Editing your own account re-reads the session (`useAuthStore.refresh`) so the header follows at once. The role always comes from the session the server created, never from a form.

## Reviews

Reviews are real: they live in the database, one per user per product, and come with the product detail (`reviews[]`: `id, rating, comment, createdAt, author, verifiedBuyer`).

- Create, edit and delete go through the API (`features/reviews/api.ts`, `useReviewMutations`). The rules are shared (`REVIEW_LIMITS` in `@ays/validators`): rating 1 to 5, comment 10 to 500 characters. A second review by the same user is refused with `409 review_exists`; an author edits and deletes their own review, an admin can delete any.
- The headline rating, count and 1 to 5 histogram are computed by the database (`product_rating_stats`), so after each change the product detail and the catalog list are refetched; nothing is averaged in the browser.
- `verifiedBuyer` is computed in SQL (the author has an order line for the product) and is not required to review.
- `features/reviews/sort.ts` (pure) only sorts the list for display.
- Deleting a product is a soft delete, so its reviews stay in the database and come back with a restore.

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
- Quantity rule: a whole number from 1 to the stock. The server caps an add and clamps a set; the UI computes the same value locally for the optimistic update and uses the stock the catalog reports.
- Lines whose product no longer exists in the catalog (for example an admin deleted it) are removed (server delete) and a toast tells the user once.
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

There is no reset button any more: the data lives in the database, so a reset is a manual reseed (see the hardening issue). The dashboard shows live counts instead.
