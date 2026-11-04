import { useMemo } from 'react'

import type { Review } from '@/features/products/schemas'

import type { ReviewItem, ReviewSort } from '../schemas'
import { sortReviews } from '../sort'

const toItem = (review: Review): ReviewItem => ({
  key: String(review.id),
  id: review.id,
  rating: review.rating,
  comment: review.comment,
  date: review.createdAt,
  authorId: review.author.id,
  authorName: review.author.name,
  verifiedBuyer: review.verifiedBuyer,
})

/** The product's reviews as the API sent them (verified-buyer flag included), sorted for display. */
export function useProductReviews(reviews: Review[], sort: ReviewSort): ReviewItem[] {
  return useMemo(() => sortReviews(reviews.map(toItem), sort), [reviews, sort])
}
