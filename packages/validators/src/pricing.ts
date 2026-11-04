/** Money is computed in integer cents to avoid float drift. */
export function toCents(amount: number) {
  return Math.round(amount * 100)
}

export function salePriceCents(product: { priceCents: number; discountPercentage: number }) {
  return Math.round(product.priceCents * (1 - product.discountPercentage / 100))
}
