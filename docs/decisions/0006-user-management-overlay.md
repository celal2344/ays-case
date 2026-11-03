# 0006 Admin user management via a local overlay

- **Status:** Accepted (2026-11-03)

## Context
The admin panel must add, edit and remove users. DummyJSON's `POST/PUT/DELETE /users` are simulated and persist nothing; `role` is accepted in the body but never saved.

## Decision
Same pattern as products ([ADR-0003](0003-query-plus-zustand-overlay.md)): read `GET /users` through TanStack Query, keep every admin change in a persisted `useUserOverlayStore`, merge with a pure `applyUserOverlay`. Local ids start at 100000; network calls are skipped for local ids. The overlay patch for the logged-in user is applied on top of `/auth/me`.

## Consequences
- Role edits only take effect in this browser (documented in README known limitations).
- Guardrails (no self-delete/demote, no last-admin removal) are enforced client-side in the mutation hooks.
- Login still authenticates against real DummyJSON accounts; overlay-created users cannot log in (DummyJSON does not know them).

## Alternatives considered
- **Local credential store (own auth):** would let created users log in, but replaces the DummyJSON auth the project deliberately uses ([ADR-0002](0002-dummyjson-auth.md)).
