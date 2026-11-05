import { eq, sql } from 'drizzle-orm'

import type { Database } from '../../../db/client'
import {
  cartItems,
  favorites,
  productImages,
  productTags,
  products,
  recentlyViewed,
} from '../../../db/schema'

type ProductValues = Partial<typeof products.$inferInsert>
type ImageValues = { url: string; isPrimary?: boolean }[]

export async function insertProduct(db: Database, values: ProductValues & { title: string }) {
  const [created] = await db
    .insert(products)
    .values(values as typeof products.$inferInsert)
    .returning({ id: products.id })
  return created!.id
}

/** Returns false when the product does not exist. */
export async function updateProduct(db: Database, id: number, values: ProductValues) {
  const [row] = await db
    .update(products)
    .set({ ...values, updatedAt: sql`now()` })
    .where(eq(products.id, id))
    .returning({ id: products.id })
  return row !== undefined
}

/** Returns false when the product does not exist. */
export async function markDeleted(db: Database, id: number) {
  const [row] = await db
    .update(products)
    .set({ deletedAt: sql`now()`, updatedAt: sql`now()` })
    .where(eq(products.id, id))
    .returning({ id: products.id })
  return row !== undefined
}

/** Returns false when the product does not exist. */
export async function clearDeleted(db: Database, id: number) {
  const [row] = await db
    .update(products)
    .set({ deletedAt: null, updatedAt: sql`now()` })
    .where(eq(products.id, id))
    .returning({ id: products.id })
  return row !== undefined
}

export async function replaceTags(db: Database, productId: number, tagIds: number[]) {
  await db.delete(productTags).where(eq(productTags.productId, productId))
  if (tagIds.length > 0) {
    await db.insert(productTags).values(tagIds.map((tagId) => ({ productId, tagId })))
  }
}

/** `images` are stored in array order; `primaryIndex` marks the primary one. */
export async function replaceImages(
  db: Database,
  productId: number,
  images: ImageValues,
  primaryIndex: number,
) {
  await db.delete(productImages).where(eq(productImages.productId, productId))
  if (images.length === 0) return
  await db.insert(productImages).values(
    images.map((image, position) => ({
      productId,
      url: image.url,
      position,
      isPrimary: position === primaryIndex,
    })),
  )
}

/** A removed product leaves every cart, favorites and recently viewed list. */
export async function removeFromLists(db: Database, productId: number) {
  await db.delete(cartItems).where(eq(cartItems.productId, productId))
  await db.delete(favorites).where(eq(favorites.productId, productId))
  await db.delete(recentlyViewed).where(eq(recentlyViewed.productId, productId))
}
