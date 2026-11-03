import type { CartItem, CartTotals } from '@/features/cart/selectors'
import { toCents } from '@/features/products/pricing'

import type { Order, Shipping } from './schemas'

interface BuildOrderInput {
  id: string
  userId: number
  createdAt: string
  items: CartItem[]
  totals: CartTotals
  shipping: Shipping
  remoteCartId?: number
}

/** Freezes the cart into an order: titles and prices are copied, not referenced. */
export function buildOrder({ items, totals, shipping, ...rest }: BuildOrderInput): Order {
  return {
    ...rest,
    lines: items.map(({ product, quantity, unitCents }) => ({
      productId: product.id,
      title: product.title,
      thumbnail: product.thumbnail,
      listCents: toCents(product.price),
      unitCents,
      discountPercentage: product.discountPercentage,
      quantity,
    })),
    totals: { ...totals },
    shipping: {
      fullName: shipping.fullName.trim(),
      address: shipping.address.trim(),
      city: shipping.city.trim(),
      phone: shipping.phone.trim(),
    },
  }
}

export const hasBought = (orders: Order[], userId: number, productId: number) =>
  orders.some((o) => o.userId === userId && o.lines.some((l) => l.productId === productId))
