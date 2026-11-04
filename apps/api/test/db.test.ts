import { randomUUID } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { count, eq, max } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createDb } from '../src/db/client'
import {
  brands,
  categories,
  productImages,
  productRatingStats,
  products,
  productTags,
  reviews,
  tags,
} from '../src/db/schema'
import { runSeed } from '../src/db/seed'

const url = process.env.DATABASE_URL_SESSION

const newProduct = (sku: string, categoryId: number) => ({
  title: 'New',
  description: 'New product',
  sku,
  categoryId,
  priceCents: 100,
})

// Runs against the session pooler inside a throwaway schema; `public` is never touched.
describe.skipIf(!url)('database (migrations, seed, constraints, rating view)', () => {
  const schemaName = `test_${randomUUID().replaceAll('-', '').slice(0, 12)}`
  const admin = createDb(url ?? '', { max: 1 })
  const scoped = createDb(url ?? '', { max: 1, searchPath: schemaName })
  const { db } = scoped
  let categoryId = 0

  beforeAll(async () => {
    await admin.client.unsafe(`create schema "${schemaName}"`)
    // drizzle-kit qualifies foreign keys and the view with "public"; point them at the throwaway schema.
    const folder = new URL('../src/db/migrations/', import.meta.url)
    for (const file of readdirSync(fileURLToPath(folder))
      .filter((f) => f.endsWith('.sql'))
      .sort()) {
      const sql = readFileSync(new URL(file, folder), 'utf8').replaceAll(
        '"public".',
        `"${schemaName}".`,
      )
      for (const statement of sql.split('--> statement-breakpoint')) {
        await scoped.client.unsafe(statement)
      }
    }
  })

  afterAll(async () => {
    await admin.client.unsafe(`drop schema if exists "${schemaName}" cascade`)
    await Promise.all([admin.client.end(), scoped.client.end()])
  })

  const total = async (table: typeof products | typeof categories | typeof brands | typeof tags) =>
    (await db.select({ n: count() }).from(table))[0]?.n

  it('seeds the catalog and a re-run is a no-op', async () => {
    const expected = await runSeed(db)
    const snapshot = async () => ({
      categories: await total(categories),
      brands: await total(brands),
      tags: await total(tags),
      products: await total(products),
      productTags: (await db.select({ n: count() }).from(productTags))[0]?.n,
      productImages: (await db.select({ n: count() }).from(productImages))[0]?.n,
    })
    const first = await snapshot()
    expect(first).toEqual({
      categories: expected.categories,
      brands: expected.brands,
      tags: expected.tags,
      products: expected.products,
      productTags: expected.productTags,
      productImages: expected.productImages,
    })
    await runSeed(db)
    expect(await snapshot()).toEqual(first)
    categoryId = (await db.select({ id: categories.id }).from(categories).limit(1))[0]?.id ?? 0
  })

  it('continues the id sequences above the seeded max', async () => {
    const top = (await db.select({ top: max(products.id) }).from(products))[0]?.top ?? 0
    const [created] = await db
      .insert(products)
      .values(newProduct('SEQ-1', categoryId))
      .returning({ id: products.id })
    expect(created?.id).toBeGreaterThan(top)
  })

  it('rejects rows that break a CHECK constraint', async () => {
    const bad = [
      { ...newProduct('BAD-1', categoryId), stock: -1 },
      { ...newProduct('BAD-2', categoryId), priceCents: -1 },
      { ...newProduct('BAD-3', categoryId), discountPercentage: '101' },
      { ...newProduct('BAD-4', categoryId), minimumOrderQuantity: 0 },
      { ...newProduct('BAD-5', categoryId), weightG: 0 },
    ]
    for (const row of bad) {
      await expect(db.insert(products).values(row)).rejects.toThrow()
    }
  })

  it('enforces unique skus, one primary image and cascades on delete', async () => {
    await expect(db.insert(products).values(newProduct('SEQ-1', categoryId))).rejects.toThrow()

    const [product] = await db
      .insert(products)
      .values(newProduct('IMG-1', categoryId))
      .returning({ id: products.id })
    const productId = product?.id ?? 0
    await db.insert(productImages).values({ productId, url: 'a', position: 0, isPrimary: true })
    await expect(
      db.insert(productImages).values({ productId, url: 'b', position: 1, isPrimary: true }),
    ).rejects.toThrow()

    await db.delete(products).where(eq(products.id, productId))
    expect(
      await db.select().from(productImages).where(eq(productImages.productId, productId)),
    ).toHaveLength(0)
  })

  it('validates reviews and keeps one review per user and product', async () => {
    const [product] = await db
      .insert(products)
      .values(newProduct('REV-0', categoryId))
      .returning({ id: products.id })
    const productId = product?.id ?? 0
    const review = (userId: string, rating: number, comment = 'A long enough comment') => ({
      productId,
      userId,
      rating,
      comment,
    })

    await expect(db.insert(reviews).values(review('u1', 6))).rejects.toThrow()
    await expect(db.insert(reviews).values(review('u1', 0))).rejects.toThrow()
    await expect(db.insert(reviews).values(review('u1', 3, 'too short'))).rejects.toThrow()
    await db.insert(reviews).values(review('u1', 5))
    await expect(db.insert(reviews).values(review('u1', 4))).rejects.toThrow()
  })

  it('computes rating average, count and histogram in SQL, null without reviews', async () => {
    const [withReviews, withoutReviews] = await db
      .insert(products)
      .values([newProduct('RATE-1', categoryId), newProduct('RATE-2', categoryId)])
      .returning({ id: products.id })
    const productId = withReviews?.id ?? 0
    const comment = 'A long enough comment'
    await db.insert(reviews).values([
      { productId, userId: 'a', rating: 5, comment },
      { productId, userId: 'b', rating: 4, comment },
      { productId, userId: 'c', rating: 4, comment },
    ])

    const [stats] = await db
      .select()
      .from(productRatingStats)
      .where(eq(productRatingStats.productId, productId))
    expect(stats).toMatchObject({
      ratingAvg: '4.3',
      ratingCount: 3,
      rating1: 0,
      rating2: 0,
      rating3: 0,
      rating4: 2,
      rating5: 1,
    })

    const [empty] = await db
      .select()
      .from(productRatingStats)
      .where(eq(productRatingStats.productId, withoutReviews?.id ?? 0))
    expect(empty).toMatchObject({ ratingAvg: null, ratingCount: 0, rating5: 0 })
  })
})
