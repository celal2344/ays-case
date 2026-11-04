import { and, desc, eq, isNull, sql } from 'drizzle-orm'

import type { Database } from '../../db/client'
import { cartItems, products } from '../../db/schema'

const itemColumns = {
  productId: cartItems.productId,
  quantity: cartItems.quantity,
  addedAt: cartItems.createdAt,
}

const toItem = (row: { productId: number; quantity: number; addedAt: Date }) => ({
  ...row,
  addedAt: row.addedAt.toISOString(),
})

/** Soft-deleted products are hidden by joining `products`. */
export async function listCart(db: Database, userId: string) {
  const rows = await db
    .select(itemColumns)
    .from(cartItems)
    .innerJoin(products, eq(products.id, cartItems.productId))
    .where(and(eq(cartItems.userId, userId), isNull(products.deletedAt)))
    .orderBy(desc(cartItems.createdAt), desc(cartItems.productId))
  return rows.map(toItem)
}

export async function findStock(db: Database, productId: number) {
  const [row] = await db
    .select({ stock: products.stock })
    .from(products)
    .where(and(eq(products.id, productId), isNull(products.deletedAt)))
  return row?.stock
}

/** Adds `quantity` to the line (creating it), never going above `stock`. */
export async function addToLine(
  db: Database,
  userId: string,
  productId: number,
  quantity: number,
  stock: number,
) {
  const [row] = await db
    .insert(cartItems)
    .values({ userId, productId, quantity: Math.min(quantity, stock) })
    .onConflictDoUpdate({
      target: [cartItems.userId, cartItems.productId],
      set: {
        quantity: sql`least(${cartItems.quantity} + ${quantity}, ${stock})`,
        updatedAt: sql`now()`,
      },
    })
    .returning(itemColumns)
  return toItem(row!)
}

/** Sets the line's quantity (creating the line if it is missing). */
export async function setLine(db: Database, userId: string, productId: number, quantity: number) {
  const [row] = await db
    .insert(cartItems)
    .values({ userId, productId, quantity })
    .onConflictDoUpdate({
      target: [cartItems.userId, cartItems.productId],
      set: { quantity, updatedAt: sql`now()` },
    })
    .returning(itemColumns)
  return toItem(row!)
}

export async function removeLine(db: Database, userId: string, productId: number) {
  await db
    .delete(cartItems)
    .where(and(eq(cartItems.userId, userId), eq(cartItems.productId, productId)))
}

export async function clearCart(db: Database, userId: string) {
  await db.delete(cartItems).where(eq(cartItems.userId, userId))
}
