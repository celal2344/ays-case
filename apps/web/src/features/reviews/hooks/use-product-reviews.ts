import { useMemo } from 'react'

import type { Review } from '@/features/products/schemas'

import type { ReviewItem, ReviewSort, ReviewSummary } from '../schemas'
import { useReviewsStore } from '../store'
import { mergeReviews, sortReviews, summarize } from '../summary'

const NONE: never[] = []

/** Seeded DummyJSON reviews + reviews written here, summarized and sorted. */
export function useProductReviews(productId: number, seeded: Review[], sort: ReviewSort) {
  const local = useReviewsStore((s) => s.byProduct[productId]) ?? NONE
  const hidden = useReviewsStore((s) => s.hidden[productId]) ?? NONE

  return useMemo<{ items: ReviewItem[]; summary: ReviewSummary }>(() => {
    const merged = mergeReviews(seeded, local, hidden)
    return { items: sortReviews(merged, sort), summary: summarize(merged) }
  }, [seeded, local, hidden, sort])
}
