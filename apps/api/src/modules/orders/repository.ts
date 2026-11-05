import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm'

import type { Database } from '../../db/client'
import { cartItems, orderLines, orders, productImages, products } from '../../db/schema'

export type OrderRow = typeof orders.$inferSelect
export type LineRow = typeof orderLines.$inferSelect
export type NewOrder = typeof orders.$inferInsert
export type NewLine = typeof orderLines.$inferInsert

export function cartLines(db: Database, userId: string) {
  return db
    .select({ productId: cartItems.productId, quantity: cartItems.quantity })
    .from(cartItems)
    .where(eq(cartItems.userId, userId))
    .orderBy(asc(cartItems.productId))
}

/** Locks the rows (`for update`) in id order so concurrent checkouts cannot interleave. */
export function lockProducts(db: Database, productIds: number[]) {
  return db
    .select({
      id: products.id,
      title: products.title,
      priceCents: products.priceCents,
      discountPercentage: products.discountPercentage,
      stock: products.stock,
      deletedAt: products.deletedAt,
    })
    .from(products)
    .where(inArray(products.id, productIds))
    .orderBy(asc(products.id))
    .for('update')
}

export async function insertOrder(db: Database, values: NewOrder) {
  const [created] = await db.insert(orders).values(values).returning()
  return created!
}

export function primaryThumbnails(db: Database, productIds: number[]) {
  return db
    .select({ productId: productImages.productId, url: productImages.url })
    .from(productImages)
    .where(and(inArray(productImages.productId, productIds), eq(productImages.isPrimary, true)))
}

export function insertLines(db: Database, values: NewLine[]) {
  return db.insert(orderLines).values(values).returning()
}

/** Guarded update: stock cannot go below the quantity taken. Returns false when it would. */
export async function takeStock(db: Database, productId: number, quantity: number) {
  const taken = await db
    .update(products)
    .set({ stock: sql`${products.stock} - ${quantity}`, updatedAt: sql`now()` })
    .where(and(eq(products.id, productId), sql`${products.stock} >= ${quantity}`))
    .returning({ id: products.id })
  return taken.length > 0
}

export async function clearCart(db: Database, userId: string) {
  await db.delete(cartItems).where(eq(cartItems.userId, userId))
}

export async function linesOf(db: Database, orderIds: string[]) {
  if (orderIds.length === 0) return new Map<string, LineRow[]>()
  const rows = await db
    .select()
    .from(orderLines)
    .where(inArray(orderLines.orderId, orderIds))
    .orderBy(asc(orderLines.id))
  return Map.groupBy(rows, (row) => row.orderId)
}

export function listByUser(db: Database, userId: string) {
  return db
    .select()
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt), desc(orders.id))
}

export async function findForUser(db: Database, userId: string, id: string) {
  const [row] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, id), eq(orders.userId, userId)))
  return row
}
