# Dummy Shop — Frontend Case

React + Tailwind e-commerce frontend on top of [DummyJSON](https://dummyjson.com): fake auth with roles, admin product CRUD, user cart and checkout. No real backend — writes are simulated by DummyJSON and kept locally.

> Status: **planning**. Docs in [`docs/`](docs/) are the source of truth; start with the [implementation plan](docs/implementation-plan.md).

## Stack
Vite · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui (Radix) · TanStack Router · TanStack Query · Zustand · Axios · Zod · TanStack Form · i18next · Vitest + Testing Library + MSW · Playwright · pnpm · GitHub Actions · Vercel

## Docs
| File | What's in it |
|---|---|
| [requirements.md](docs/requirements.md) | Case PDF as numbered requirements + extras, with acceptance criteria |
| [architecture.md](docs/architecture.md) | Layers, folder structure, diagrams |
| [data-and-state.md](docs/data-and-state.md) | Who owns which data; the product overlay; cart/orders/auth stores |
| [api.md](docs/api.md) | DummyJSON endpoints used and their quirks |
| [routes-and-pages.md](docs/routes-and-pages.md) | Route table, access rules, page contents and UI states |
| [conventions.md](docs/conventions.md) | Code practices (carried over from StokMate) |
| [testing.md](docs/testing.md) | Test strategy + manual QA checklist |
| [implementation-plan.md](docs/implementation-plan.md) | Gates G0–G8 with tasks and done-criteria |
| [decisions/](docs/decisions/) | ADRs |
| [AGENTS.md](AGENTS.md) | Rules for AI agents working in this repo |

## Setup (after G0)
```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm test       # unit/integration
pnpm e2e        # Playwright
```

## Demo accounts
DummyJSON users (password is checked by DummyJSON, the login page has one-click fill buttons):

| Role | Username | Password |
|---|---|---|
| admin | `emilys` | `emilyspass` |
| user | _pick a `role: "user"` account from `GET /users/filter?key=role&value=user` in G2_ | — |

## AI workflow
Planned with a consultant agent (this doc set), built gate by gate with a lead agent, each gate reviewed and tested by me before commit. Details per gate in the [plan](docs/implementation-plan.md).
