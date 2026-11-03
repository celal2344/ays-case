import { useCartStore } from '@/features/cart/store'
import { useProductOverlayStore } from '@/features/products/overlay-store'
import { useReviewsStore } from '@/features/reviews/store'

/**
 * "Reset demo data": back to the untouched DummyJSON catalog. Every store that holds data a demo user
 * created is cleared here; later gates add their stores (orders in G6, users in G5b).
 */
export function resetDemoData() {
  useProductOverlayStore.getState().reset()
  useReviewsStore.getState().reset()
  useCartStore.getState().reset()
}
