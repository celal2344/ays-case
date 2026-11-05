# 0003 TanStack Query for remote reads + Zustand overlay for local writes

- **Status:** Superseded by the real backend (see [backend.md](../backend.md)); kept as history. Was: Accepted (2026-11-03)

## Context
DummyJSON simulates add/update/delete but persists nothing. Brief requires a store and local persistence. Remote reads benefit from caching, loading/error states and retries.

## Decision
- TanStack Query owns remote data (catalog, detail, categories).
- Zustand `productOverlay` owns admin changes (`created`, `patched`, `deleted`), persisted.
- One pure function `applyOverlay(remote, overlay)` merges them; every view reads through `useCatalog()`.
- Mutations call DummyJSON (skipped for local ids), then write the overlay on success.

## Consequences
- Clear ownership: server data vs user data; Query features for free.
- Two sources → must never read Query data for products without the merge (enforced by only exporting `useCatalog`/`useProduct` from the feature).
- Local ids (≥ 100000) needed because DummyJSON's echo id collides.

## Alternatives considered
- **Zustand only + axios:** single source and closest to the brief wording, but reimplements loading/error/cache by hand.
- **Optimistic writes into the Query cache only:** lost on reload unless the cache is persisted; persisting the whole cache is heavier and mixes remote and local.
