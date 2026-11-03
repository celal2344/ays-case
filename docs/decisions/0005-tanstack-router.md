# 0005 TanStack Router (file-based) over React Router

- **Status:** Accepted (2026-11-03)

## Context
Need protected + role-protected routes, URL-synced list filters, data prefetch.

## Decision
TanStack Router with file routes, typed + Zod-validated search params, `beforeLoad` guards, loaders using `queryClient.query`.

## Consequences
- Type-safe links and search params; same pattern as StokMate.
- Generated `routeTree.gen.ts` must be committed and kept in sync (plugin does it).

## Alternatives considered
- **React Router 7 (data mode):** more familiar to reviewers, weaker search-param typing.
