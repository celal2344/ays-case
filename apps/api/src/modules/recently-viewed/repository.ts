import { MAX_RECENTLY_VIEWED } from '@ays/validators'
import { and, desc, eq, isNull, notInArray, sql } from 'drizzle-orm'

import type { Database } from '../../db/client'
import { products, recentlyViewed } from '../../db/schema'

/** Product ids, newest first. Soft-deleted products are hidden by joining `products`. */
export async function listRecentlyViewed(db: Database, userId: string) {
  const rows = await db
    .select({ productId: recentlyViewed.productId })
    .from(recentlyViewed)
    .innerJoin(products, eq(products.id, recentlyViewed.productId))
    .where(and(eq(recentlyViewed.userId, userId), isNull(products.deletedAt)))
    .orderBy(desc(recentlyViewed.viewedAt), desc(recentlyViewed.productId))
  return rows.map((row) => row.productId)
}

export async function productExists(db: Database, productId: number) {
  const [row] = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.id, productId), isNull(products.deletedAt)))
  return row !== undefined
}

/** Marks a view and trims the user's list to the newest `MAX_RECENTLY_VIEWED`, in one transaction. */
export async function recordView(db: Database, userId: string, productId: number) {
  await db.transaction(async (tx) => {
    await tx
      .insert(recentlyViewed)
      .values({ userId, productId })
      .onConflictDoUpdate({
        target: [recentlyViewed.userId, recentlyViewed.productId],
        set: { viewedAt: sql`now()` },
      })
    const keep = tx
      .select({ productId: recentlyViewed.productId })
      .from(recentlyViewed)
      .where(eq(recentlyViewed.userId, userId))
      .orderBy(desc(recentlyViewed.viewedAt), desc(recentlyViewed.productId))
      .limit(MAX_RECENTLY_VIEWED)
    await tx
      .delete(recentlyViewed)
      .where(and(eq(recentlyViewed.userId, userId), notInArray(recentlyViewed.productId, keep)))
  })
}

export async function clearRecentlyViewed(db: Database, userId: string) {
  await db.delete(recentlyViewed).where(eq(recentlyViewed.userId, userId))
}
