# Ays Case

A Trendyol-style online shop built on [DummyJSON](https://dummyjson.com): login with roles, shop, cart, checkout, and an admin panel. No real backend, so writes are simulated and kept in the browser.

**Live:** https://ayscase.vercel.app

| Shop | Product |
|:---:|:---:|
| ![Shop](docs/screenshots/shop.png) | ![Product](docs/screenshots/product.png) |
| **Order** | **Admin** |
| ![Order](docs/screenshots/order.png) | ![Admin](docs/screenshots/admin.png) |

## Run it

```bash
pnpm install
pnpm dev          # web on http://localhost:5173, API on http://localhost:3000 (proxied at /api)
pnpm test         # unit + integration
pnpm e2e          # Playwright
```

Node 24+ and pnpm 11+. The repo is a pnpm + Turborepo workspace; the web app lives in `apps/web` and all commands above run from the root.

## Deployment

One Vercel project using [Services](https://vercel.com/docs/services) (Beta), configured in the root `vercel.json`: the web app (`apps/web`) is served at `/` and the API (`apps/api`, Hono) at `/api`, on the same domain. That means first-party cookies, no CORS, and every preview deployment of the web app talks to the matching preview API. In dev, Vite proxies `/api` to the local API, so relative paths are identical to production.

API environment variables (names only, values live in the Vercel dashboard): `DATABASE_URL`, `DATABASE_URL_SESSION`, `BETTER_AUTH_SECRET`, `LOG_LEVEL`. Better Auth derives its base URL and trusted origins from Vercel's system variables, so previews work; `BETTER_AUTH_URL` is only needed to override that. Locally they go in `apps/api/.env.development`.

## Demo accounts

| Role | Username | Password |
|---|---|---|
| Admin | `emilys` | `emilyspass` |
| User | `averyp` | `averyppass` |

The login page has one-click fill buttons.

## Features

- Login, logout, session restore, protected and admin-only routes
- Search, category mega-menu, filters, sorting, numbered pagination (URL-synced)
- Product page with gallery, reviews, favorites
- Cart, checkout, order history
- Admin: dashboard, product CRUD, user CRUD, reset demo data
- TR / EN, light / dark, responsive, accessible (axe checked)

## Stack

React 19 · Vite · TypeScript · Tailwind 4 · shadcn/ui · TanStack Router, Query, Form, Table · Zustand · Axios · Zod · i18next · Vitest · Playwright · GitHub Actions · Vercel

## How it was built (AI workflow)

1. **Plan:** a consultant agent turned the case brief into requirements, architecture, API notes, ADRs and a gated plan (G0–G8).
2. **Issues:** every gate and every follow-up became a GitHub issue.
3. **Build:** a developer agent implemented one issue per branch and opened a PR, following the rules in [`AGENTS.md`](AGENTS.md).
4. **Review:** CI (lint, format, typecheck, unit tests, build, e2e) ran on every PR; I reviewed and tested, then merged. The agent never merged on its own.
5. **Project manager pass:** a separate agent reviewed the finished repo and filed new issues (deep links on Vercel, design, pagination, mega-menu, favorites), which went through the same issue → PR → review loop.

Result: 20 merged PRs, 300 unit tests, 7 e2e specs.

## Known limitations

- DummyJSON does not persist writes, so admin changes, orders, carts, reviews and favorites live in `localStorage` of this browser.
- Users created in the admin panel cannot log in (DummyJSON does not know them).
- Roles are enforced in the UI only; there is no server to enforce them.
- Tokens are kept in `localStorage`, which is fine for a demo but not for production.

More detail on architecture and decisions is in [`docs/`](docs/).
