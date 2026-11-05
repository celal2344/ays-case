import { salePriceCents, type Order, type Shipping } from '@ays/validators'

import { getDb } from '../../db/client'
import * as repository from './repository'
import type { LineRow, OrderRow } from './repository'

export type PlaceOrderResult =
  | { ok: true; order: Order }
  | { ok: false; code: 'cart_empty'; message: string }
  | { ok: false; code: 'product_unavailable' | 'insufficient_stock'; message: string }

/** Thrown inside the transaction to roll everything back with a reason the route can answer. */
class CheckoutRefused extends Error {
  readonly code: 'product_unavailable' | 'insufficient_stock'

  constructor(code: 'product_unavailable' | 'insufficient_stock', message: string) {
    super(message)
    this.code = code
  }
}

function toOrder(row: OrderRow, lines: LineRow[]): Order {
  return {
    id: row.id,
    userId: row.userId,
    createdAt: row.createdAt.toISOString(),
    lines: lines.map((line) => ({
      productId: line.productId,
      title: line.title,
      thumbnail: line.thumbnail,
      listCents: line.listCents,
      unitCents: line.unitCents,
      discountPercentage: Number(line.discountPercentage),
      quantity: line.quantity,
    })),
    totals: {
      subtotalCents: row.subtotalCents,
      discountCents: row.discountCents,
      totalCents: row.totalCents,
    },
    shipping: {
      fullName: row.shippingFullName,
      address: row.shippingAddress,
      city: row.shippingCity,
      phone: row.shippingPhone,
    },
  }
}

/**
 * The purchase, in one transaction: lock the cart's products in id order, check every line against the
 * server's own catalog, price it, insert the order and its frozen lines, take the stock with a guarded
 * update, and empty the cart. Any refusal rolls all of it back. The client sends only the shipping details.
 */
export async function placeOrder(userId: string, shipping: Shipping): Promise<PlaceOrderResult> {
  const db = getDb()
  const cart = await repository.cartLines(db, userId)
  if (cart.length === 0) return { ok: false, code: 'cart_empty', message: 'Your cart is empty' }

  try {
    const order = await db.transaction(async (tx) => {
      const locked = await repository.lockProducts(
        tx,
        cart.map((line) => line.productId),
      )
      const byId = new Map(locked.map((p) => [p.id, p]))

      const priced = cart.map((line) => {
        const product = byId.get(line.productId)
        if (!product || product.deletedAt !== null) {
          throw new CheckoutRefused(
            'product_unavailable',
            product
              ? `${product.title} is no longer available`
              : 'A product in your cart is no longer available',
          )
        }
        if (line.quantity > product.stock) {
          throw new CheckoutRefused('insufficient_stock', `Not enough stock for ${product.title}`)
        }
        const discountPercentage = Number(product.discountPercentage)
        return {
          product,
          quantity: line.quantity,
          discountPercentage,
          unitCents: salePriceCents({ priceCents: product.priceCents, discountPercentage }),
        }
      })

      const subtotalCents = priced.reduce((sum, l) => sum + l.product.priceCents * l.quantity, 0)
      const totalCents = priced.reduce((sum, l) => sum + l.unitCents * l.quantity, 0)

      const created = await repository.insertOrder(tx, {
        userId,
        subtotalCents,
        discountCents: subtotalCents - totalCents,
        totalCents,
        shippingFullName: shipping.fullName,
        shippingAddress: shipping.address,
        shippingCity: shipping.city,
        shippingPhone: shipping.phone,
      })

      const thumbnails = await repository.primaryThumbnails(
        tx,
        priced.map((l) => l.product.id),
      )
      const thumbnailOf = new Map(thumbnails.map((t) => [t.productId, t.url]))

      const lines = await repository.insertLines(
        tx,
        priced.map((l) => ({
          orderId: created.id,
          productId: l.product.id,
          title: l.product.title,
          thumbnail: thumbnailOf.get(l.product.id) ?? null,
          listCents: l.product.priceCents,
          unitCents: l.unitCents,
          discountPercentage: String(l.discountPercentage),
          quantity: l.quantity,
        })),
      )

      // guarded update: even if the lock were bypassed, stock cannot go below the quantity taken
      for (const line of priced) {
        if (!(await repository.takeStock(tx, line.product.id, line.quantity))) {
          throw new CheckoutRefused(
            'insufficient_stock',
            `Not enough stock for ${line.product.title}`,
          )
        }
      }

      await repository.clearCart(tx, userId)
      return toOrder(created, lines)
    })
    return { ok: true, order }
  } catch (error) {
    if (error instanceof CheckoutRefused) {
      return { ok: false, code: error.code, message: error.message }
    }
    throw error
  }
}

/** The user's own orders, newest first. */
export async function listOrders(userId: string): Promise<Order[]> {
  const db = getDb()
  const rows = await repository.listByUser(db, userId)
  const lines = await repository.linesOf(
    db,
    rows.map((r) => r.id),
  )
  return rows.map((row) => toOrder(row, lines.get(row.id) ?? []))
}

/** One of the user's own orders; someone else's id is simply not found. */
export async function getOrder(userId: string, id: string): Promise<Order | undefined> {
  const db = getDb()
  const row = await repository.findForUser(db, userId, id)
  if (!row) return undefined
  const lines = await repository.linesOf(db, [row.id])
  return toOrder(row, lines.get(row.id) ?? [])
}
