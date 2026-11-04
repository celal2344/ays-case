# Agent rules — ays-case

## Read first
1. The GitHub issue you were given — work only on that scope.
2. `docs/conventions.md`, `docs/data-and-state.md`, `docs/api.md`.
3. Relevant ADRs in `docs/decisions/`.

## Hard rules
- Components never import `lib/http` or `features/*/api` directly → use feature hooks.
- Never read product data from Query without the overlay merge (`useCatalog` / `useProduct`).
- No network call for local product ids (`isLocal(id)`).
- Zustand: always select slices; persisted stores have `version` + `migrate`; keys from `lib/storage.ts`.
- All user-facing text through i18n; add keys to **both** `en.ts` and `tr.ts`.
- API responses are typed by the shared client (`hc<AppType>` from `@ays/api-client`) and `@ays/validators`: call it only inside `features/*/api.ts`, through `call()` from `lib/api.ts`. Do not hand-write response types or re-parse responses, and never compute ratings, availability or other API-owned figures in the browser.
- Exact dependency versions; no new dependency without saying why in the handoff.
- No `any`, no `console.log`, no commented-out code, no TODOs left in a finished gate.
- Don't edit `docs/` unless the gate says so. If the docs are wrong or block you, stop and report.
- Don't edit `apps/web/src/components/ui/*` (shadcn) except via the shadcn CLI.

## Before handing off
```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm check:translations
```
All green. Then write a handoff summary: done, files changed, decisions, open items.

## Delivery
One PR per gate from `gate/gN-name`. When the gate is green, open the PR and **stop**; wait for the owner's approval before merging or starting the next gate.

## Commits
Conventional commits (`feat(cart): …`). Small, one topic each.

## Tests
- Tests go in a `test/` folder inside the feature (or lib/component group) they cover, e.g. `apps/web/src/features/cart/test/store.test.ts`; shared helpers live in `apps/web/src/test/`. See `docs/testing.md`.
