import { REVIEW_LIMITS, reviewBodySchema } from '@ays/validators'

export const REVIEW_MIN_LENGTH = REVIEW_LIMITS.comment.min
export const REVIEW_MAX_LENGTH = REVIEW_LIMITS.comment.max

// The rules are the API's own (shared validators); the form shows its own translated texts.
export const reviewFormSchema = reviewBodySchema
export type { ReviewBody as ReviewFormValues } from '@ays/validators'

/** One row in the reviews list. */
export interface ReviewItem {
  key: string
  id: number
  rating: number
  comment: string
  date: string
  authorId: string
  authorName: string
  /** Computed by the API: the author has an order with this product. */
  verifiedBuyer: boolean
}

export type ReviewSort = 'newest' | 'highest' | 'lowest'

/** Rating figures as the API computed them (SQL view); the client never derives them. */
export interface ReviewSummary {
  /** Null while a product has no reviews. */
  average: number | null
  count: number
  /** Number of reviews per star. */
  histogram: Record<'1' | '2' | '3' | '4' | '5', number>
}
