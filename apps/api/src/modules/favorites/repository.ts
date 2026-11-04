import { and, desc, eq, isNull } from 'drizzle-orm'

import type { Database } from '../../db/client'
import { favorites, products } from '../../db/schema'

/** Product ids, newest first. Soft-deleted products are hidden by joining `products`. */
export async function listFavorites(db: Database, userId: string) {
  const rows = await db
    .select({ productId: favorites.productId })
    .from(favorites)
    .innerJoin(products, eq(products.id, favorites.productId))
    .where(and(eq(favorites.userId, userId), isNull(products.deletedAt)))
    .orderBy(desc(favorites.createdAt), desc(favorites.productId))
  return rows.map((row) => row.productId)
}

export async function productExists(db: Database, productId: number) {
  const [row] = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.id, productId), isNull(products.deletedAt)))
  return row !== undefined
}

export async function addFavorite(db: Database, userId: string, productId: number) {
  await db.insert(favorites).values({ userId, productId }).onConflictDoNothing()
}

export async function removeFavorite(db: Database, userId: string, productId: number) {
  await db
    .delete(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.productId, productId)))
}
