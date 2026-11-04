import { salePriceCents } from '@ays/validators'

import type { Product } from './schemas'

export function hasDiscount(product: Pick<Product, 'discountPercentage'>) {
  return product.discountPercentage >= 1
}

/** Orders of a single item at or above this sale price show a "Free shipping" tag (display only). */
export const FREE_SHIPPING_THRESHOLD_CENTS = 5000

export function qualifiesForFreeShipping(
  product: Pick<Product, 'priceCents' | 'discountPercentage'>,
) {
  return salePriceCents(product) >= FREE_SHIPPING_THRESHOLD_CENTS
}
