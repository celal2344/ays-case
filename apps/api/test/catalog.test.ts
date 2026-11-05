import {
  categoryListResponseSchema,
  productDetailResponseSchema,
  productListResponseSchema,
} from '@ays/validators'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { getDb } from '../src/db/client'
import { products } from '../src/db/schema'
import { root } from '../src/root'
import { useSeededDatabase } from './helpers/test-db'

const get = (path: string) => root.request(path)

let close: () => Promise<void>

beforeAll(async () => {
  ;({ close } = await useSeededDatabase())
})
afterAll(async () => {
  await close()
})

describe('GET /api/products', () => {
  it('returns the whole catalog, matching the shared schema', async () => {
    const res = await get('/api/products')
    expect(res.status).toBe(200)
    const body = productListResponseSchema.parse(await res.json())
    expect(body.data).toHaveLength(194)
    expect(body.data[0]).toMatchObject({
      id: 1,
      priceCents: 999,
      category: { slug: 'beauty' },
      brand: { name: 'Essence' },
    })
  })

  it('computes rating and review count in SQL from the reviews', async () => {
    const { data } = productListResponseSchema.parse(await (await get('/api/products')).json())
    const first = data[0]
    expect(first?.reviewCount).toBe(3)
    // DummyJSON ratings of product 1 are 3, 4 and 5
    expect(first?.rating).toBe(4)
    expect(data.every((p) => p.reviewCount === 3 && p.rating !== null)).toBe(true)
  })

  it('derives the primary image as thumbnail and sends tags', async () => {
    const { data } = productListResponseSchema.parse(await (await get('/api/products')).json())
    expect(data.every((p) => p.thumbnail?.startsWith('https://'))).toBe(true)
    expect(data[0]?.tags.map((t) => t.slug)).toEqual(['beauty', 'mascara'])
  })

  it('reports null rating and zero reviews for an unreviewed product, and derives availability', async () => {
    const db = getDb()
    const [created] = await db
      .insert(products)
      .values({
        title: 'Fresh',
        description: 'No reviews yet',
        sku: 'FRESH-1',
        categoryId: 1,
        priceCents: 500,
        stock: 0,
      })
      .returning({ id: products.id })
    const { data } = productListResponseSchema.parse(await (await get('/api/products')).json())
    expect(data.find((p) => p.id === created?.id)).toMatchObject({
      rating: null,
      reviewCount: 0,
      availability: 'out',
      thumbnail: null,
    })
    await db
      .update(products)
      .set({ stock: 3 })
      .where(eq(products.id, created?.id ?? 0))
    const low = productListResponseSchema.parse(await (await get('/api/products')).json())
    expect(low.data.find((p) => p.id === created?.id)?.availability).toBe('low')
    await db
      .update(products)
      .set({ stock: 50 })
      .where(eq(products.id, created?.id ?? 0))
    const plenty = productListResponseSchema.parse(await (await get('/api/products')).json())
    expect(plenty.data.find((p) => p.id === created?.id)?.availability).toBe('in')
  })

  it('excludes soft-deleted products from the list and the detail', async () => {
    await getDb().update(products).set({ deletedAt: new Date() }).where(eq(products.id, 2))
    const { data } = productListResponseSchema.parse(await (await get('/api/products')).json())
    expect(data.some((p) => p.id === 2)).toBe(false)
    const res = await get('/api/products/2')
    expect(res.status).toBe(404)
    await getDb().update(products).set({ deletedAt: null }).where(eq(products.id, 2))
  })
})

describe('GET /api/products/:id', () => {
  it('returns detail with images, policies, units, histogram and reviews', async () => {
    const res = await get('/api/products/1')
    expect(res.status).toBe(200)
    const { data } = productDetailResponseSchema.parse(await res.json())
    expect(data).toMatchObject({
      id: 1,
      sku: 'BEA-ESS-ESS-001',
      weightG: 4000,
      widthMm: 151,
      heightMm: 131,
      depthMm: 230,
      warranty: { label: '1 week warranty' },
      reviewCount: 3,
    })
    expect(data.images[0]).toMatchObject({ position: 0, isPrimary: true })
    expect(data.thumbnail).toBe(data.images[0]?.url)
    expect(data.ratingHistogram).toEqual({ '1': 0, '2': 0, '3': 1, '4': 1, '5': 1 })
    expect(data.reviews).toHaveLength(3)
    expect(data.reviews[0]?.author.name).toBeTruthy()
    expect(JSON.stringify(data.reviews)).not.toContain('@')
  })

  it('answers 404 for an unknown product and 422 for a bad id', async () => {
    const missing = await get('/api/products/99999')
    expect(missing.status).toBe(404)
    expect(await missing.json()).toEqual({
      code: 'not_found',
      message: 'Product not found',
      requestId: missing.headers.get('x-request-id'),
    })
    const invalid = await get('/api/products/abc')
    expect(invalid.status).toBe(422)
    expect(await invalid.json()).toMatchObject({ code: 'validation_error' })
  })
})

describe('GET /api/categories', () => {
  it('returns the categories in display order', async () => {
    const res = await get('/api/categories')
    const { data } = categoryListResponseSchema.parse(await res.json())
    expect(data).toHaveLength(24)
    expect(data[0]).toMatchObject({ slug: 'beauty' })
  })
})
