import { describe, expect, it } from 'vitest'

import { fixtureProducts } from '@/test/fixtures/products'

import type { Category, Product } from '../schemas'
import { getSuggestions } from '../suggestions'

const base = fixtureProducts[0]!
const make = (id: number, over: Partial<Product>): Product => ({
  ...base,
  id,
  brand: undefined,
  tags: [],
  ...over,
})
const categories: Category[] = [
  { slug: 'beauty', name: 'Beauty' },
  { slug: 'beach-gear', name: 'Beach gear' },
  { slug: 'empty', name: 'Empty shelf' },
]

describe('getSuggestions', () => {
  const catalog = [
    make(1, { title: 'Red Essence', category: 'beauty' }),
    make(2, { title: 'Essence Mascara', category: 'beauty' }),
    make(3, { title: 'Lipstick', category: 'beauty', brand: 'Essence Co' }),
    make(4, { title: 'Tag match', category: 'beach-gear', tags: ['essence'] }),
  ]

  it('needs at least 2 characters', () => {
    expect(getSuggestions(catalog, categories, 'e', 'en').products).toEqual([])
    expect(getSuggestions(catalog, categories, ' e ', 'en').categories).toEqual([])
  })

  it('ranks title-starts-with, then title-contains, then brand/category/tags', () => {
    const ids = getSuggestions(catalog, categories, 'ess', 'en').products.map((p) => p.id)
    expect(ids).toEqual([2, 1, 3, 4])
  })

  it('caps products and categories and counts products per category', () => {
    const many = Array.from({ length: 9 }, (_, i) =>
      make(10 + i, { title: `Beach ${i}`, category: 'beach-gear' }),
    )
    const result = getSuggestions(many, categories, 'be', 'en', { products: 5, categories: 1 })
    expect(result.products).toHaveLength(5)
    expect(result.categories).toEqual([{ ...categories[1], count: 9 }])
  })

  it('lists matching categories that still have products, names starting with the text first', () => {
    const result = getSuggestions(catalog, categories, 'be', 'en')
    expect(result.categories.map((c) => c.slug)).toEqual(['beach-gear', 'beauty'])
    expect(getSuggestions(catalog, categories, 'empty', 'en').categories).toEqual([])
  })

  it('lowercases Turkish dotted and dotless i correctly', () => {
    const tr = [make(20, { title: 'IŞIK lambası' }), make(21, { title: 'İstanbul çantası' })]
    expect(getSuggestions(tr, [], 'ışık', 'tr').products.map((p) => p.id)).toEqual([20])
    expect(getSuggestions(tr, [], 'iSTANBUL', 'tr').products.map((p) => p.id)).toEqual([21])
  })

  it('only knows the products it is given, so deleted ones never appear', () => {
    expect(getSuggestions(catalog.slice(1), categories, 'red', 'en').products).toEqual([])
  })

  it('returns nothing when nothing matches', () => {
    const result = getSuggestions(catalog, categories, 'zzz', 'en')
    expect(result).toEqual({ products: [], categories: [] })
  })
})
