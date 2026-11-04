import { useOrdersStore } from '@/features/orders/store'
import { useProductOverlayStore } from '@/features/products/overlay-store'
import { useSearchStore } from '@/features/search/store'
import { useReviewsStore } from '@/features/reviews/store'
import { useUserOverlayStore } from '@/features/users/overlay-store'

/**
 * "Reset demo data": back to the untouched catalog and users from the API. Every browser store that holds
 * data a demo user created is cleared here. The cart, favorites and recently viewed live on the server.
 */
export function resetDemoData() {
  useProductOverlayStore.getState().reset()
  useUserOverlayStore.getState().reset()
  useReviewsStore.getState().reset()
  useOrdersStore.getState().reset()
  useSearchStore.getState().reset()
}
