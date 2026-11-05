# Routes and pages

> **Historical:** written for the DummyJSON-era plan. Where it disagrees with [backend.md](backend.md) and [api.md](api.md), those win.


## Route table

| Path                              | Access                                       | Page                                    | Search params                          |
| --------------------------------- | -------------------------------------------- | --------------------------------------- | -------------------------------------- |
| `/`                               | public                                       | redirect → `/products`                  |                                        |
| `/login`                          | public (logged in → redirect to `/products`) | Login                                   | `redirect?: string`                    |
| `/products`                       | public                                       | Shop list                               | `q, category, sort, order, page, view` |
| `/products/$productId`            | public                                       | Product detail                          |                                        |
| `/cart`                           | auth                                         | Cart                                    |                                        |
| `/checkout`                       | auth, cart not empty                         | Checkout                                |                                        |
| `/orders`                         | auth                                         | Order history                           |                                        |
| `/orders/$orderId`                | auth, own order                              | Order detail / success                  | `placed?: 1`                           |
| `/admin`                          | admin                                        | Dashboard (live counts, list links)     |                                        |
| `/admin/products`                 | admin                                        | Product table; the product form is a large modal on it | `q, category, sort, order, page, deleted, new, edit, section` |
| `/admin/products/new`             | admin                                        | Redirects to `/admin/products?new=1`    |                                        |
| `/admin/products/$productId/edit` | admin                                        | Redirects to `/admin/products?edit=<id>` |                                        |
| `/admin/lookups/$kind`            | admin                                        | Categories, brands, tags and policies; create and edit in a dialog | `new, edit`          |
| `/admin/users`                    | admin                                        | User table; create and edit in a dialog | `q, role, page, new, edit`             |
| `/admin/users/new`                | admin                                        | Redirects to `/admin/users?new=1`       |                                        |
| `/admin/users/$userId/edit`       | admin                                        | Redirects to `/admin/users?edit=<id>`   |                                        |
| `/forbidden`                      | public                                       | 403 ("Admins only" + back link)         |                                        |
| `*`                               | —                                            | 404 (global `defaultNotFoundComponent`) |                                        |

Global fallbacks live on the router: `defaultNotFoundComponent` (404) and `defaultErrorComponent` (unexpected render/loader error with Retry), both rendered inside `AppShell`. `redirect` is used as given (not validated); this is listed under README known limitations.

Guards (TanStack Router `beforeLoad`, pattern from StokMate `_authenticated.tsx`):

```ts
// routes/_auth.tsx
beforeLoad: async ({ context, location }) => {
  await context.auth.bootstrap();
  if (context.auth.status !== "authenticated")
    throw redirect({ to: "/login", search: { redirect: location.href } });
};
// routes/_auth/_admin.tsx
beforeLoad: ({ context }) => {
  if (context.auth.user?.role !== "admin") throw redirect({ to: "/forbidden" });
};
```

Public browsing is allowed so the shop is visible before login; "Add to cart" while logged out sends the user to `/login?redirect=<current>` and adds the item after login (pending action stored in `sessionStorage`).

Search params validated with Zod in `validateSearch` (`page` coerced, `sort ∈ {price,rating,title}`, defaults stripped from the URL).

## Layout

- **Header:** logo, nav (Products, Orders, Admin menu with Products / Users if admin), cart icon with count badge, theme toggle, language toggle, user menu (name, avatar, role badge, Logout) or Login button.
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

### Product detail (Trendyol-style, shadcn neutral theme)

Layout only; no third-party branding. Desktop is two columns, mobile stacks.

- Breadcrumb: Home › category › title.
- Left: gallery with thumbnail strip, click-to-zoom dialog.
- Right: brand + title, rating + review count (links to reviews tab), price box (price, struck old price, discount badge), stock / "only N left", key attributes grid (brand, category, warranty, shipping, return policy, dimensions, weight), quantity stepper, **Buy now** (primary) and **Add to cart**.
- Below: **Similar products** carousel; tabs **Product info** (specs), **Description**, **Reviews**.
- Reviews tab: rating summary (average + 5→1 histogram), sort select, review cards (avatar initials, name, date, stars, text, "verified buyer" badge), write-review form for logged-in users (login prompt otherwise), edit/delete own, admin delete any.
- Sticky add-to-cart bar once the main buttons leave the viewport (bottom bar on mobile).
- Not built: seller box, coupons, Q&A, photo reviews, favorites.
  Local products show only the fields they have. Deleted / missing → 404.

### Cart

Line list (thumb, title link, unit price, stepper, line total, remove), clear cart, summary card (subtotal, discount, total, "Checkout" button). Empty state with link to shop. Sticky summary on mobile bottom.

### Checkout

Two columns (stacks on mobile): shipping form (full name, address, city, phone — Zod) + order summary. "Place order" → loading → `/orders/$id?placed=1`. Guard: empty cart → redirect `/cart`.

### Orders

List of own orders (date, item count, total, link). Detail: snapshot lines, totals, shipping info, success banner if `placed=1`.

### Admin dashboard

Stat cards: active products, users, low stock, out of stock and orders, all read from the API. Links to the product table, the user table, "New product" and every lookup list.

### Admin product table

TanStack Table: thumbnail, title, category, brand, price, stock, rating, actions (Edit, Delete, or Restore for a soft-deleted product). Column sort, search, category filter, a deleted filter (active, include, only), pagination 20. "New product" button. Delete → `AlertDialog` → toast with result. Mobile: horizontal scroll inside the card.

### Admin users

TanStack Table: avatar, name, username, email, role badge, actions (Edit, Delete); search, role filter, pagination 20; "New user" button. Delete disabled on your own row and on the last admin. Same form pattern as products:

| Field                | Rule                                       |
| -------------------- | ------------------------------------------ |
| username             | required, 3–30, unique (case-insensitive)  |
| password             | initial password: required on create (8–72), not on the edit form |
| firstName / lastName | required, 1–50                             |
| email                | valid email                                |
| role                 | `admin`                                    | `user` | `moderator` (select; moderator has no special behaviour) |

### Admin create / edit (products)

TanStack Form + Zod:

| Field                                                                                                    | Rule                             |
| -------------------------------------------------------------------------------------------------------- | -------------------------------- |
| title                                                                                                    | required, 2–100                  |
| description                                                                                              | required, 10–1000                |
| category                                                                                                 | required, from categories list   |
| brand                                                                                                    | optional, ≤ 50                   |
| price                                                                                                    | required, > 0, 2 decimals        |
| discountPercentage                                                                                       | 0–90                             |
| stock                                                                                                    | integer ≥ 0                      |
| thumbnail                                                                                                | URL, optional (placeholder used) |
| Thumbnail preview. Submit disabled while pending; unsaved-changes guard (`useBlocker`) on navigate away. |

## UI states checklist (every data page)

loading skeleton · error + retry · empty · success toast on writes · disabled buttons while pending · keyboard focus visible · `aria-live` on cart count.

## Admin layout and forms

Every `/admin/*` route renders inside the admin layout (`routes/_auth/_admin/admin.tsx`): a sidebar that stays mounted between admin pages (sticky under the header, collapsible to icons, a drawer below `md`) and the page. Groups: General (Dashboard), Catalog (Products, Categories, Brands, Tags), Policies (Warranty, Shipping, Returns), Users. Products shows a badge with the low-stock count. The dashboard stat cards link to their pages.

Forms open as overlays and the open form is in the URL, so refresh, the back button and shared links work:

- **Lookups and users:** a dialog, `?new=1` or `?edit=<id>`.
- **Product:** a large modal (full screen on small screens), `?new=1` or `?edit=<id>`, plus `&section=general|pricing|size|tags|images` while editing. Creating walks the sections as steps (each is validated before Next; the last step is a review). Editing moves freely between sections and saves from any of them; after a failed save the sections with a problem get a red dot and the first one opens.
- Closing a form with changes (Esc, backdrop, Cancel, the back button) asks to discard them. Switching section is not a way out.
- Tags are picked with a searchable multi-select (chips, filter as you type, arrows/Enter/Backspace, the most used tags one click away while the search is empty). Brand and category are searchable selects. `GET /api/admin/tags` returns `productCount` for each tag.
