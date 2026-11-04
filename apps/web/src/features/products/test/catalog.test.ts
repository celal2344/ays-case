import { describe, expect, it } from 'vitest'

import { fixtureProducts } from '@/test/fixtures/products'

import { filterByCategory, filterByQuery, paginate, sortProducts } from '../catalog'
import type { Product } from '../schemas'

const ids = (products: Product[]) => products.map((p) => p.id)

describe('sortProducts by rating', () => {
  it('puts unreviewed products last in both directions', () => {
    const rated = (id: number, rating: number | null) => ({ ...fixtureProducts[0]!, id, rating })
    const list = [rated(1, null), rated(2, 4), rated(3, 5)]
    expect(ids(sortProducts(list, 'rating', 'asc'))).toEqual([2, 3, 1])
    expect(ids(sortProducts(list, 'rating', 'desc'))).toEqual([3, 2, 1])
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
    const product = { ...fixtureProducts[0]!, title: 'İstanbul Çayı', brand: null, tags: [] }
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
