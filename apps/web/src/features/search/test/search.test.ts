import { beforeEach, describe, expect, it } from 'vitest'

import type { Category, Product } from '@/features/products/schemas'
import { fixtureProducts } from '@/test/fixtures/products'

import { getBestDeals, getSuggestedTags } from '../panel-data'
import { MAX_RECENT_SEARCHES, useSearchStore } from '../store'

const make = (id: number, over: Partial<Product>): Product => ({
  ...fixtureProducts[0]!,
  id,
  tags: [],
  stock: 10,
  discountPercentage: 0,
  rating: 4,
  ...over,
})

describe('getSuggestedTags', () => {
  const categories: Category[] = [{ slug: 'beauty', name: 'Beauty' }]

  it('orders by frequency then alphabet, skips category tags and caps the list', () => {
    const products = [
      make(1, { tags: ['mascara', 'beauty', 'Eyes'] }),
      make(2, { tags: ['mascara', 'lipstick'] }),
      make(3, { tags: ['lipstick', 'mascara', 'mascara'] }),
      make(4, { tags: ['eyes'] }),
    ]
    expect(getSuggestedTags(products, categories, 10)).toEqual(['mascara', 'eyes', 'lipstick'])
    expect(getSuggestedTags(products, categories, 2)).toEqual(['mascara', 'eyes'])
  })

  it('is empty without tags', () => {
    expect(getSuggestedTags([make(1, {})], categories, 5)).toEqual([])
  })
})

describe('getBestDeals', () => {
  it('keeps in-stock discounted products, best discount first, then rating, then id', () => {
    const products = [
      make(1, { discountPercentage: 10 }),
      make(2, { discountPercentage: 30, stock: 0 }),
      make(3, { discountPercentage: 20, rating: 3 }),
      make(4, { discountPercentage: 20, rating: 5 }),
      make(5, { discountPercentage: 20, rating: 5 }),
      make(6, { discountPercentage: 0 }),
    ]
    expect(getBestDeals(products, 10).map((p) => p.id)).toEqual([4, 5, 3, 1])
    expect(getBestDeals(products, 2).map((p) => p.id)).toEqual([4, 5])
  })
})

describe('recent searches store', () => {
  beforeEach(() => useSearchStore.getState().reset())
  const s = () => useSearchStore.getState()

  it('records newest first, trims, ignores empty and de-duplicates case-insensitively (Turkish-safe)', () => {
    s().record(' mascara ')
    s().record('')
    s().record('IŞIK')
    s().record('Mascara')
    s().record('ışık')
    expect(s().recent).toEqual(['ışık', 'Mascara'])
  })

  it('keeps at most 6', () => {
    for (let i = 1; i <= MAX_RECENT_SEARCHES + 2; i++) s().record(`q${i}`)
    expect(s().recent).toHaveLength(MAX_RECENT_SEARCHES)
    expect(s().recent[0]).toBe(`q${MAX_RECENT_SEARCHES + 2}`)
  })

  it('removes one, clears all', () => {
    s().record('a')
    s().record('b')
    s().remove('A')
    expect(s().recent).toEqual(['b'])
    s().clear()
    expect(s().recent).toEqual([])
  })
})
