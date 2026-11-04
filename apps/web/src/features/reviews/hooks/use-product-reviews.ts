import { useMemo } from 'react'

import type { Review } from '@/features/products/schemas'

import { mergeReviews, sortReviews } from '../merge'
import type { ReviewItem, ReviewSort } from '../schemas'
import { useReviewsStore } from '../store'

const NONE: never[] = []

/** API reviews + reviews written here, merged and sorted. The averages come from the API. */
export function useProductReviews(productId: number, seeded: Review[], sort: ReviewSort) {
  const local = useReviewsStore((s) => s.byProduct[productId]) ?? NONE
  const hidden = useReviewsStore((s) => s.hidden[productId]) ?? NONE

  return useMemo<ReviewItem[]>(
    () => sortReviews(mergeReviews(seeded, local, hidden), sort),
    [seeded, local, hidden, sort],
  )
}
