# 0001 React + Vite (not Vue 3, not Next.js)

- **Status:** Accepted (2026-11-03)

## Context
Brief allows React or Vue 3. Evaluation weighs code quality and structure. I know React well (StokMate, Aug 2026); Vue would be new.

## Decision
React 19 + Vite + TypeScript SPA.

## Consequences
- Reuse proven StokMate patterns (TanStack Router/Query/Form, shadcn) → faster, cleaner.
- Not a Vue showcase. Zustand is the matching store (Pinia is Vue-only).

## Alternatives considered
- **Vue 3 + Pinia:** learning value, but quality/speed risk on a judged case.
- **Next.js:** SSR adds nothing here (no backend, all data client-side), more config.
