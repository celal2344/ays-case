import { describe, expect, it } from 'vitest'

import type { Product } from '@/features/products/schemas'
import { cat } from '@/test/fixtures/products'
import { sortProducts } from '@/features/products/catalog'

import {
  catalogStats,
  categoryTiles,
  dealProducts,
  heroProducts,
  HERO_IDS,
  newestProducts,
  topBrands,
  topRatedProducts,
} from '../selectors'

const item = (id: number, category: string, over: Partial<Product> = {}) =>
  ({
    id,
    title: `p${id}`,
    category: cat(category),
    brand: null,
    thumbnail: `https://img.test/${id}.png`,
    rating: null,
    reviewCount: 0,
    discountPercentage: 0,
    createdAt: '2026-01-01T00:00:00Z',
    ...over,
  }) as Product

const ids = (list: Product[]) => list.map((p) => p.id)

describe('heroProducts', () => {
  it('uses the configured ids in slot order', () => {
    const all = HERO_IDS.map((id, i) =>
      item(id, ['laptops', 'tops', 'beauty', 'groceries', 'motorcycle'][i] ?? 'beauty'),
    )
    expect(ids(heroProducts([...all].reverse()))).toEqual([...HERO_IDS])
  })

  it('replaces a missing product with the best rated one of a group not shown yet', () => {
    const products = [
      item(7, 'laptops'),
      item(124, 'tops'),
      item(51, 'groceries'),
      item(152, 'motorcycle'),
      item(900, 'laptops', { rating: 5, reviewCount: 9 }),
      item(901, 'furniture', { rating: 4.8, reviewCount: 4 }),
    ]
    expect(ids(heroProducts(products))).toEqual([7, 124, 901, 51, 152])
  })

  it('skips products without an image', () => {
    expect(ids(heroProducts([item(7, 'laptops', { thumbnail: null })]))).toEqual([])
  })
})

describe('strips', () => {
  const products = [
    item(1, 'laptops', {
      discountPercentage: 5,
      rating: 4.9,
      reviewCount: 2,
      createdAt: '2026-03-01',
    }),
    item(2, 'tops', {
      discountPercentage: 30,
      rating: 4.1,
      reviewCount: 8,
      createdAt: '2026-01-01',
    }),
    item(3, 'beauty', {
      discountPercentage: 12,
      rating: 4.7,
      reviewCount: 5,
      createdAt: '2026-02-01',
    }),
    item(4, 'beauty', { createdAt: '2025-01-01' }),
  ]

  it('deals: biggest discount first, none without a discount', () => {
    expect(ids(dealProducts(products))).toEqual([2, 3, 1])
  })

  it('top rated: needs at least three reviews', () => {
    expect(ids(topRatedProducts(products))).toEqual([3, 2])
  })

  it('newest: latest createdAt first', () => {
    expect(ids(newestProducts(products)).slice(0, 3)).toEqual([1, 3, 2])
  })
})

describe('tiles, brands and stats', () => {
  const products = [
    item(1, 'laptops', { brand: { id: 1, slug: 'apple', name: 'Apple' }, rating: 4.5 }),
    item(2, 'smartphones', { brand: { id: 1, slug: 'apple', name: 'Apple' }, rating: 4.9 }),
    item(3, 'tablets', { brand: { id: 2, slug: 'asus', name: 'Asus' } }),
    item(4, 'beauty', { brand: { id: 3, slug: 'chanel', name: 'Chanel' } }),
  ]

  it('one tile per group with a count and up to two images, best rated first', () => {
    const tiles = categoryTiles(products)
    expect(tiles.map((t) => [t.group, t.count])).toEqual([
      ['electronics', 3],
      ['beauty', 1],
    ])
    expect(tiles[0]?.images).toEqual(['https://img.test/2.png', 'https://img.test/1.png'])
  })

  it('names the brands with the most products in a group', () => {
    expect(topBrands(products, 'electronics', 2)).toEqual(['Apple', 'Asus'])
    expect(topBrands(products, 'men', 2)).toEqual([])
  })

  it('counts products, categories and brands', () => {
    expect(catalogStats(products)).toEqual({ products: 4, categories: 4, brands: 3 })
  })
})

describe('the discount and newest sorts', () => {
  it('order the list for the "see all" links', () => {
    const list = [
      item(1, 'laptops', { discountPercentage: 5, createdAt: '2026-01-01' }),
      item(2, 'laptops', { discountPercentage: 20, createdAt: '2026-03-01' }),
      item(3, 'laptops', { discountPercentage: 10, createdAt: '2026-02-01' }),
    ]
    expect(ids(sortProducts(list, 'discount', 'desc'))).toEqual([2, 3, 1])
    expect(ids(sortProducts(list, 'newest', 'desc'))).toEqual([2, 3, 1])
  })
})
