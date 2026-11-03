import { hasBought } from '@/features/orders/build-order'
import { useOrdersStore } from '@/features/orders/store'

/** Whether a user has bought a product: they have an order containing it. */
export function useVerifiedBuyer(): (userId: number, productId: number) => boolean {
  const orders = useOrdersStore((s) => s.orders)
  return (userId, productId) => hasBought(orders, userId, productId)
}
