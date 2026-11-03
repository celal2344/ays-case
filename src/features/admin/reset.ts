import { useCartStore } from '@/features/cart/store'
import { useOrdersStore } from '@/features/orders/store'
import { useProductOverlayStore } from '@/features/products/overlay-store'
import { useReviewsStore } from '@/features/reviews/store'
import { useUserOverlayStore } from '@/features/users/overlay-store'

/**
 * "Reset demo data": back to the untouched DummyJSON catalog and users. Every store that holds data a
 * demo user created is cleared here;
 */
export function resetDemoData() {
  useProductOverlayStore.getState().reset()
  useUserOverlayStore.getState().reset()
  useReviewsStore.getState().reset()
  useCartStore.getState().reset()
  useOrdersStore.getState().reset()
}
