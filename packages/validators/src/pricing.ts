/** Money is computed in integer cents to avoid float drift. */
export function toCents(amount: number) {
  return Math.round(amount * 100)
}

export function salePriceCents(product: { price: number; discountPercentage: number }) {
  return Math.round(toCents(product.price) * (1 - product.discountPercentage / 100))
}
