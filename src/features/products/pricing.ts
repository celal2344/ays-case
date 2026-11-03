import type { Product } from './schemas'

export const LOW_STOCK_THRESHOLD = 5

/** Money is computed in integer cents to avoid float drift (conventions.md). */
export function toCents(amount: number) {
  return Math.round(amount * 100)
}

export function salePriceCents(product: Pick<Product, 'price' | 'discountPercentage'>) {
  return Math.round(toCents(product.price) * (1 - product.discountPercentage / 100))
}

export function hasDiscount(product: Pick<Product, 'discountPercentage'>) {
  return product.discountPercentage >= 1
}

export type StockLevel = 'out' | 'low' | 'in'

export function stockLevel(stock: number): StockLevel {
  if (stock <= 0) return 'out'
  return stock <= LOW_STOCK_THRESHOLD ? 'low' : 'in'
}

/** Orders of a single item at or above this sale price show a "Free shipping" tag (display only). */
export const FREE_SHIPPING_THRESHOLD_CENTS = 5000

export function qualifiesForFreeShipping(product: Pick<Product, 'price' | 'discountPercentage'>) {
  return salePriceCents(product) >= FREE_SHIPPING_THRESHOLD_CENTS
}
