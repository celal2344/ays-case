import { describe, expect, it } from 'vitest'

import { hasDiscount, stockLevel } from '../pricing'
import { productSearchSchema } from '../schemas'
import { fromSortOption, normalizeSearch, toSortOption, updateSearch } from '../search-state'

describe('product pricing helpers', () => {
  it('flags real discounts only', () => {
    expect(hasDiscount({ discountPercentage: 0.4 })).toBe(false)
    expect(hasDiscount({ discountPercentage: 10 })).toBe(true)
  })

  it('classifies stock', () => {
    expect([0, 1, 5, 6].map(stockLevel)).toEqual(['out', 'low', 'low', 'in'])
  })
})

describe('search params', () => {
  it('parses a full URL', () => {
    expect(
      productSearchSchema.parse({
        q: 'phone',
        category: 'smartphones',
        sort: 'price',
        order: 'desc',
        page: '2',
        view: 'table',
      }),
    ).toEqual({
      q: 'phone',
      category: 'smartphones',
      sort: 'price',
      order: 'desc',
      page: 2,
      view: 'table',
    })
  })

  it('falls back to defaults for malformed values instead of throwing', () => {
    expect(
      productSearchSchema.parse({ sort: 'bogus', page: '-3', view: 'cards', order: 5 }),
    ).toEqual({})
  })

  it('strips defaults from the URL', () => {
    expect(normalizeSearch({ q: '  ', page: 1, order: 'desc' })).toEqual({
      q: undefined,
      category: undefined,
      sort: undefined,
      order: undefined,
      page: undefined,
      view: undefined,
    })
    expect(normalizeSearch({ sort: 'price', order: 'asc' }).order).toBeUndefined()
    expect(normalizeSearch({ sort: 'price', order: 'desc' }).order).toBe('desc')
  })

  it('resets the page on any filter change but keeps it for a page change', () => {
    const current = { q: 'a', page: 3 }
    expect(updateSearch(current, { category: 'beauty' }).page).toBeUndefined()
    expect(updateSearch(current, { q: 'b' }).page).toBeUndefined()
    expect(updateSearch(current, { page: 4 })).toMatchObject({ q: 'a', page: 4 })
  })

  it('round-trips the combined sort select', () => {
    expect(toSortOption('price', 'desc')).toBe('price-desc')
    expect(toSortOption(undefined, undefined)).toBe('default')
    expect(fromSortOption('title-asc')).toEqual({ sort: 'title', order: 'asc' })
    expect(fromSortOption('default')).toEqual({ sort: undefined, order: undefined })
  })
})
