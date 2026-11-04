import { z } from 'zod'

export const REVIEW_MIN_LENGTH = 10
export const REVIEW_MAX_LENGTH = 500

/** A review written in this app (DummyJSON reviews are read-only and come with the product). */
export const localReviewSchema = z.object({
  id: z.string(),
  productId: z.number().int(),
  userId: z.string(),
  authorName: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string(),
  createdAt: z.string(),
})
export type LocalReview = z.infer<typeof localReviewSchema>

export const reviewFormSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(REVIEW_MIN_LENGTH).max(REVIEW_MAX_LENGTH),
})
export type ReviewFormValues = z.infer<typeof reviewFormSchema>

/** One row in the reviews list, whether it came from DummyJSON or was written here. */
export interface ReviewItem {
  key: string
  rating: number
  comment: string
  date: string
  authorName: string
  /** Present only for reviews written in this app. */
  local?: { id: string; userId: string }
}

export type ReviewSort = 'newest' | 'highest' | 'lowest'

/** Rating figures as the API computed them (SQL view); the client never derives them. */
export interface ReviewSummary {
  /** Null while a product has no reviews. */
  average: number | null
  count: number
  /** Number of reviews per star. */
  histogram: Record<1 | 2 | 3 | 4 | 5, number>
}
