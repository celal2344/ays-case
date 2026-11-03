# 0004 Load the full catalog once; filter/sort/paginate client-side

- **Status:** Accepted (2026-11-03)

## Context
Overlay adds and deletes products locally. With DummyJSON server-side pagination/search, counts, pages and search results would ignore local changes.

## Decision
`GET /products?limit=0&select=<list fields>` once per session (~194 items, small payload), merge overlay, run search/filter/sort/paginate in memory with pure functions; state in the URL.

## Consequences
- Local and remote products behave identically in every list.
- Instant filtering, easy to unit-test.
- Doesn't scale to large catalogs — documented as a known limitation; in a real API this becomes server-side again.

## Alternatives considered
- **Server-side via `/products/search`, `/category/{slug}`, `limit/skip`:** realistic but wrong totals once the overlay exists.
