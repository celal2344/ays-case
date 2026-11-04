import type { CartItem } from '@ays/validators'

import { getDb } from '../../db/client'
import * as repository from './repository'

export type LineResult =
  { ok: true; item: CartItem } | { ok: false; reason: 'not_found' | 'out_of_stock' }

/** Adds to an existing line and caps at stock; a product with no stock cannot be added. */
export async function addItem(
  userId: string,
  productId: number,
  quantity: number,
): Promise<LineResult> {
  const db = getDb()
  const stock = await repository.findStock(db, productId)
  if (stock === undefined) return { ok: false, reason: 'not_found' }
  if (stock <= 0) return { ok: false, reason: 'out_of_stock' }
  return { ok: true, item: await repository.addToLine(db, userId, productId, quantity, stock) }
}

/** Sets the quantity, clamped to 1..stock. */
export async function setQuantity(
  userId: string,
  productId: number,
  quantity: number,
): Promise<LineResult> {
  const db = getDb()
  const stock = await repository.findStock(db, productId)
  if (stock === undefined) return { ok: false, reason: 'not_found' }
  if (stock <= 0) return { ok: false, reason: 'out_of_stock' }
  const clamped = Math.min(Math.max(quantity, 1), stock)
  return { ok: true, item: await repository.setLine(db, userId, productId, clamped) }
}

export const getCart = (userId: string) => repository.listCart(getDb(), userId)
export const removeItem = (userId: string, productId: number) =>
  repository.removeLine(getDb(), userId, productId)
export const clear = (userId: string) => repository.clearCart(getDb(), userId)
