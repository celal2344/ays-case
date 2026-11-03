# Routes and pages

## Route table
| Path | Access | Page | Search params |
|---|---|---|---|
| `/` | public | redirect → `/products` | |
| `/login` | public (logged in → redirect to `/products`) | Login | `redirect?: string` |
| `/products` | public | Shop list | `q, category, sort, order, page, view` |
| `/products/$productId` | public | Product detail | |
| `/cart` | auth | Cart | |
| `/checkout` | auth, cart not empty | Checkout | |
| `/orders` | auth | Order history | |
| `/orders/$orderId` | auth, own order | Order detail / success | `placed?: 1` |
| `/admin` | admin | Dashboard (stats, reset demo data) | |
| `/admin/products` | admin | Product table | `q, category, sort, order, page` |
| `/admin/products/new` | admin | Create form | |
| `/admin/products/$productId/edit` | admin | Edit form | |
| `/forbidden` | public | 403 ("Admins only" + back link) | |
| `*` | — | 404 | |

Guards (TanStack Router `beforeLoad`, pattern from StokMate `_authenticated.tsx`):
```ts
// routes/_auth.tsx
beforeLoad: async ({ context, location }) => {
  await context.auth.bootstrap();
  if (context.auth.status !== "authenticated")
    throw redirect({ to: "/login", search: { redirect: location.href } });
}
// routes/_auth/_admin.tsx
beforeLoad: ({ context }) => {
  if (context.auth.user?.role !== "admin") throw redirect({ to: "/forbidden" });
}
```
Public browsing is allowed so the shop is visible before login; "Add to cart" while logged out sends the user to `/login?redirect=<current>` and adds the item after login (pending action stored in `sessionStorage`).

Search params validated with Zod in `validateSearch` (`page` coerced, `sort ∈ {price,rating,title}`, defaults stripped from the URL).

## Layout
- **Header:** logo, nav (Products, Orders, Admin if admin), search (on `/products`), cart icon with count badge, theme toggle, language toggle, user menu (name, avatar, role badge, Logout) or Login button.
- **Mobile (< md):** nav + toggles move into a `Sheet`; cart icon stays visible.
- **Content:** `max-w-7xl mx-auto px-4`.

## Pages
### Login
Username + password, "Fill admin" / "Fill user" buttons, submit with spinner, error from DummyJSON ("Invalid credentials"). Short note: "Demo app — accounts come from DummyJSON."

### Shop list (`/products`)
- Toolbar: search (debounced 300 ms → `?q`), category select, sort select, grid/table toggle.
- Grid: 1 / 2 / 3 / 4 columns (base / sm / lg / xl). Card = thumbnail (lazy, aspect-square), title (2-line clamp), brand, rating stars, price with discount (old price struck), stock badge (out / low ≤ 5), Add to cart.
- Table view: same data, compact.
- Pagination: 12 per page, "Showing 13–24 of 194".
- States: skeleton grid; error with Retry; empty ("No products match" + Clear filters).

### Product detail
Gallery (main image + thumbnails), title, brand, category, rating + review count, price/discount, stock, quantity stepper + Add to cart, description, specs (dimensions, weight, warranty, shipping, return policy), reviews list. Local products show only the fields they have. Deleted / missing → 404.

### Cart
Line list (thumb, title link, unit price, stepper, line total, remove), clear cart, summary card (subtotal, discount, total, "Checkout" button). Empty state with link to shop. Sticky summary on mobile bottom.

### Checkout
Two columns (stacks on mobile): shipping form (full name, address, city, phone — Zod) + order summary. "Place order" → loading → `/orders/$id?placed=1`. Guard: empty cart → redirect `/cart`.

### Orders
List of own orders (date, item count, total, link). Detail: snapshot lines, totals, shipping info, success banner if `placed=1`.

### Admin dashboard
Stat cards: total products (merged), low stock (≤ 5), out of stock, orders (all users, local), local changes count. "Reset demo data" with confirm dialog. Link to product table.

### Admin product table
TanStack Table: thumbnail, title, category, brand, price, stock, rating, actions (Edit, Delete). Column sort, search, category filter, pagination 20. "New product" button. Delete → `AlertDialog` → toast with result. Mobile: horizontal scroll inside the card.

### Admin create / edit
TanStack Form + Zod:
| Field | Rule |
|---|---|
| title | required, 2–100 |
| description | required, 10–1000 |
| category | required, from categories list |
| brand | optional, ≤ 50 |
| price | required, > 0, 2 decimals |
| discountPercentage | 0–90 |
| stock | integer ≥ 0 |
| thumbnail | URL, optional (placeholder used) |
Thumbnail preview. Submit disabled while pending; unsaved-changes guard (`useBlocker`) on navigate away.

## UI states checklist (every data page)
loading skeleton · error + retry · empty · success toast on writes · disabled buttons while pending · keyboard focus visible · `aria-live` on cart count.
