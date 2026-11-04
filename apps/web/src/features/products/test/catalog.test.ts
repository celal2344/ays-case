import { describe, expect, it } from 'vitest'

import { fixtureProducts } from '@/test/fixtures/products'

import {
  applyOverlay,
  filterByCategory,
  patchProduct,
  filterByQuery,
  paginate,
  sortProducts,
} from '../catalog'
import type { Product } from '../schemas'

const none = { created: {}, patched: {}, deleted: [] }
const ids = (products: Product[]) => products.map((p) => p.id)

describe('patchProduct', () => {
  it('re-derives availability when stock changes, using the product threshold', () => {
    const base = { ...fixtureProducts[0]!, lowStockThreshold: 5 }
    expect(patchProduct(base, { stock: 0 }).availability).toBe('out')
    expect(patchProduct(base, { stock: 5 }).availability).toBe('low')
    expect(patchProduct(base, { stock: 6 }).availability).toBe('in')
  })

  it('leaves availability alone when stock is not patched', () => {
    const base = { ...fixtureProducts[2]! }
    expect(patchProduct(base, { title: 'x' }).availability).toBe('out')
  })
})

describe('sortProducts by rating', () => {
  it('puts unreviewed products last in both directions', () => {
    const rated = (id: number, rating: number | null) => ({ ...fixtureProducts[0]!, id, rating })
    const list = [rated(1, null), rated(2, 4), rated(3, 5)]
    expect(ids(sortProducts(list, 'rating', 'asc'))).toEqual([2, 3, 1])
    expect(ids(sortProducts(list, 'rating', 'desc'))).toEqual([3, 2, 1])
  })
})

describe('applyOverlay', () => {
  it('returns the remote catalog untouched when the overlay is empty', () => {
    expect(applyOverlay(fixtureProducts, none)).toEqual(fixtureProducts)
  })

  it('hides deleted products and applies patches', () => {
    const merged = applyOverlay(fixtureProducts, {
      created: {},
      patched: { 2: { price: 1 } },
      deleted: [1],
    })
    expect(merged.some((p) => p.id === 1)).toBe(false)
    expect(merged.find((p) => p.id === 2)?.price).toBe(1)
  })

  it('puts created products first, newest first, and honours patches and deletes on them', () => {
    const base = { ...fixtureProducts[0]!, id: 100_000, title: 'old' }
    const newer = { ...base, id: 100_001, title: 'new' }
    const merged = applyOverlay(fixtureProducts, {
      created: { 100_000: base, 100_001: newer },
      patched: { 100_001: { title: 'renamed' } },
      deleted: [],
    })
    expect(ids(merged).slice(0, 2)).toEqual([100_001, 100_000])
    expect(merged[0]?.title).toBe('renamed')
    expect(
      ids(
        applyOverlay(fixtureProducts, {
          created: { 100_000: base },
          patched: {},
          deleted: [100_000],
        }),
      ),
    ).not.toContain(100_000)
  })
})

describe('filterByQuery', () => {
  it('matches title, brand, category and tags case-insensitively', () => {
    expect(ids(filterByQuery(fixtureProducts, 'ITEM 07', 'en'))).toEqual([7])
    expect(filterByQuery(fixtureProducts, 'brand 1', 'en').length).toBeGreaterThan(0)
    expect(filterByQuery(fixtureProducts, 'smartphones', 'en')).toHaveLength(10)
    expect(filterByQuery(fixtureProducts, 'even', 'en')).toHaveLength(15)
  })

  it('returns everything for an empty or blank query', () => {
    expect(filterByQuery(fixtureProducts, '', 'en')).toHaveLength(30)
    expect(filterByQuery(fixtureProducts, '   ', 'en')).toHaveLength(30)
    expect(filterByQuery(fixtureProducts, undefined, 'en')).toHaveLength(30)
  })

  it('is Turkish-safe: İ lowercases to i only in Turkish mode', () => {
    const product = { ...fixtureProducts[0]!, title: 'İstanbul Çayı', brand: undefined, tags: [] }
    expect(filterByQuery([product], 'istanbul', 'tr')).toHaveLength(1)
    expect(filterByQuery([product], 'istanbul', 'en')).toHaveLength(0)
  })
})

describe('filterByCategory', () => {
  it('keeps one category or everything', () => {
    expect(filterByCategory(fixtureProducts, 'beauty')).toHaveLength(10)
    expect(filterByCategory(fixtureProducts, undefined)).toHaveLength(30)
    expect(filterByCategory(fixtureProducts, 'nope')).toHaveLength(0)
  })
})

describe('sortProducts', () => {
  it('keeps catalog order without a sort key', () => {
    expect(sortProducts(fixtureProducts, undefined)).toBe(fixtureProducts)
  })

  it('sorts by price ascending and descending without mutating the input', () => {
    const copy = [...fixtureProducts]
    expect(ids(sortProducts(fixtureProducts, 'price', 'desc')).slice(0, 3)).toEqual([30, 29, 28])
    expect(ids(sortProducts(fixtureProducts, 'price', 'asc')).slice(0, 3)).toEqual([1, 2, 3])
    expect(fixtureProducts).toEqual(copy)
  })

  it('sorts by title and rating', () => {
    expect(sortProducts(fixtureProducts, 'title', 'asc')[0]?.title).toBe('beauty item 01')
    expect(sortProducts(fixtureProducts, 'rating', 'desc')[0]?.rating).toBe(5)
  })
})

describe('paginate', () => {
  it('slices pages and reports the range', () => {
    const page2 = paginate(fixtureProducts, 2, 12)
    expect(ids(page2.items)).toEqual(ids(fixtureProducts.slice(12, 24)))
    expect(page2).toMatchObject({ total: 30, page: 2, pageCount: 3, from: 13, to: 24 })
  })

  it('shows a short last page', () => {
    expect(paginate(fixtureProducts, 3, 12)).toMatchObject({ from: 25, to: 30 })
  })

  it('clamps out-of-range and invalid pages', () => {
    expect(paginate(fixtureProducts, 99, 12).page).toBe(3)
    expect(paginate(fixtureProducts, 0, 12).page).toBe(1)
    expect(paginate(fixtureProducts, Number.NaN, 12).page).toBe(1)
  })

  it('handles an empty list', () => {
    expect(paginate([], 1, 12)).toMatchObject({ total: 0, pageCount: 1, from: 0, to: 0, items: [] })
  })
})
