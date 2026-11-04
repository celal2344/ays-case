import { describe, expect, it } from 'vitest'

import { clampMinimumOrder, loadSeedData, slugify } from '../src/db/seed'

describe('seed data', () => {
  const data = loadSeedData()

  it('matches the expected row counts', () => {
    expect(data.categories).toHaveLength(24)
    expect(data.products).toHaveLength(194)
    expect(data.brands).toHaveLength(63)
    expect(data.warranty).toHaveLength(10)
    expect(data.shipping).toHaveLength(6)
    expect(data.returns).toHaveLength(5)
    expect(data.tags).toHaveLength(138)
    expect(data.users).toHaveLength(208)
    expect(data.reviews).toHaveLength(582)
  })

  it('keeps DummyJSON ids and stores money as integer cents', () => {
    expect(data.products[0]).toMatchObject({ id: 1, priceCents: 999, categorySlug: 'beauty' })
    expect(data.products.every((p) => Number.isInteger(p.priceCents))).toBe(true)
  })

  it('has unique ids, skus and barcodes, and every product points at a seeded category', () => {
    const slugs = new Set(data.categories.map((c) => c.slug))
    expect(new Set(data.products.map((p) => p.id)).size).toBe(data.products.length)
    expect(new Set(data.products.map((p) => p.sku)).size).toBe(data.products.length)
    expect(new Set(data.products.map((p) => p.barcode)).size).toBe(data.products.length)
    expect(data.products.every((p) => slugs.has(p.categorySlug))).toBe(true)
  })

  it('satisfies every CHECK rule of the schema', () => {
    for (const p of data.products) {
      expect(p.stock).toBeGreaterThanOrEqual(0)
      expect(p.minimumOrderQuantity).toBeGreaterThanOrEqual(1)
      expect(p.minimumOrderQuantity).toBeLessThanOrEqual(Math.max(1, p.stock))
      expect(Number(p.discountPercentage)).toBeGreaterThanOrEqual(0)
      expect(Number(p.discountPercentage)).toBeLessThanOrEqual(100)
      expect(p.weightG).toBeGreaterThan(0)
      expect([p.widthMm, p.heightMm, p.depthMm].every((n) => n > 0)).toBe(true)
    }
  })

  it('puts the thumbnail first as the only primary image', () => {
    for (const p of data.products) {
      expect(p.images[0]?.isPrimary).toBe(true)
      expect(p.images.filter((image) => image.isPrimary)).toHaveLength(1)
      expect(p.images.map((image) => image.position)).toEqual(p.images.map((_, i) => i))
    }
  })

  it('converts units: kilograms to grams, centimetres to millimetres', () => {
    expect(data.products[0]).toMatchObject({ weightG: 4000, widthMm: 151, heightMm: 131 })
  })
})

describe('seeded users and reviews', () => {
  const data = loadSeedData()

  it('keeps the DummyJSON roles', () => {
    const count = (role: string) => data.users.filter((u) => u.role === role).length
    expect([count('admin'), count('moderator'), count('user')]).toEqual([5, 10, 193])
    expect(data.users.find((u) => u.username === 'emilys')?.role).toBe('admin')
    expect(data.users.find((u) => u.username === 'averyp')?.role).toBe('user')
  })

  it('assigns each product at most one review per user, to existing users', () => {
    const ids = new Set(data.users.map((u) => u.id))
    const pairs = new Set(data.reviews.map((r) => `${r.productId}:${r.userId}`))
    expect(pairs.size).toBe(data.reviews.length)
    expect(data.reviews.every((r) => ids.has(r.userId))).toBe(true)
  })

  it('keeps rating, comment and date of the original reviews', () => {
    expect(data.reviews[0]).toMatchObject({
      productId: 1,
      rating: 3,
      comment: 'Would not recommend!',
    })
  })
})

describe('mapping helpers', () => {
  it('clamps the minimum order quantity to stock, never below 1', () => {
    expect(clampMinimumOrder(48, 99)).toBe(48)
    expect(clampMinimumOrder(48, 10)).toBe(10)
    expect(clampMinimumOrder(5, 0)).toBe(1)
  })

  it('slugifies names', () => {
    expect(slugify('Calvin Klein')).toBe('calvin-klein')
    expect(slugify('  Beauty & Care! ')).toBe('beauty-care')
  })
})
