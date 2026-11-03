/**
 * Whether a user has bought a product. Reads the orders store once it exists (G6); until then nobody
 * has an order, so nobody is a verified buyer.
 */
export function useVerifiedBuyer(): (userId: number, productId: number) => boolean {
  return () => false
}
