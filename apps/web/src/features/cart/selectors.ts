import { salePriceCents, toCents } from '@ays/validators'
import type { Product } from '@/features/products/schemas'

import type { CartLine } from './store'

export interface CartItem {
  product: Product
  /** Quantity actually purchasable: never above the current stock. */
  quantity: number
  /** False when the product is out of stock; such lines are excluded from totals. */
  available: boolean
  unitCents: number
  lineCents: number
}

export interface CartTotals {
  /** Sum at list price. */
  subtotalCents: number
  discountCents: number
  totalCents: number
}

export const selectCount = (lines: CartLine[]) => lines.reduce((sum, l) => sum + l.quantity, 0)

/** Joins lines with the merged catalog; lines whose product is gone are returned as `missing`. */
export function buildCartItems(lines: CartLine[], products: Product[]) {
  const byId = new Map(products.map((p) => [p.id, p]))
  const items: CartItem[] = []
  const missing: number[] = []
  for (const line of lines) {
    const product = byId.get(line.productId)
    if (!product) {
      missing.push(line.productId)
      continue
    }
    const available = product.stock > 0
    const quantity = Math.min(line.quantity, Math.max(product.stock, 0))
    const unitCents = salePriceCents(product)
    items.push({
      product,
      quantity: available ? quantity : line.quantity,
      available,
      unitCents,
      lineCents: available ? unitCents * quantity : 0,
    })
  }
  return { items, missing }
}

/** Integer cents throughout, so totals never drift. Unavailable lines do not count. */
export function cartTotals(items: CartItem[]): CartTotals {
  let subtotalCents = 0
  let totalCents = 0
  for (const item of items) {
    if (!item.available) continue
    subtotalCents += toCents(item.product.price) * item.quantity
    totalCents += item.lineCents
  }
  return { subtotalCents, totalCents, discountCents: subtotalCents - totalCents }
}
