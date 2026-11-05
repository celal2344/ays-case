# Ays Case

A full-stack online shop: catalog and search, accounts, cart, checkout, orders, reviews and an admin panel.

**Live:** https://ayscase.vercel.app · **API docs:** https://ayscase.vercel.app/api/docs

## Demo accounts

| Role  | Username | Password     |
| ----- | -------- | ------------ |
| Admin | `emilys` | `emilyspass` |
| User  | `averyp` | `averyppass` |

Public on purpose; the login page has one-click demo buttons. You can also register your own account.

## Features

- Register, sign in with username or email, roles (admin / user) enforced by the API
- Homepage, category mega menu, search, filters, sorting, pagination
- Product pages with gallery, reviews and favorites
- Server-side cart, favorites and recently viewed; checkout creates an order in one transaction
- Order history with product images and reviews from the order
- Admin panel: dashboard, products, categories, brands, tags, policies and users
- TR / EN, light / dark, responsive, accessible

## Stack

React 19 · Vite · TypeScript · Tailwind 4 · shadcn/ui · TanStack Router, Query, Form · Zustand · Zod · Hono · Drizzle · Better Auth · Postgres (Supabase) · Vitest · Playwright · Vercel

## Run it

```bash
pnpm install
pnpm dev    # web :5173, API :3000
pnpm test
```

## How it was built

Planned, implemented and reviewed with AI agents: every change went through a GitHub issue, a pull request from a developer agent, CI, and my review before merge. Rules for agents are in [`AGENTS.md`](AGENTS.md); more detail is in [`docs/`](docs/).
