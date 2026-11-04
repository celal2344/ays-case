import { z } from 'zod'

import { reviewSchema } from './catalog.js'
import { envelope } from './http.js'

/** Same numbers as the database CHECKs on `reviews`. */
export const REVIEW_LIMITS = { comment: { min: 10, max: 500 }, rating: { min: 1, max: 5 } } as const

export const reviewBodySchema = z.object({
  rating: z.number().int().min(REVIEW_LIMITS.rating.min).max(REVIEW_LIMITS.rating.max),
  comment: z.string().trim().min(REVIEW_LIMITS.comment.min).max(REVIEW_LIMITS.comment.max),
})

export const reviewUpdateBodySchema = reviewBodySchema
  .partial()
  .refine((body) => body.rating !== undefined || body.comment !== undefined, 'Nothing to update')

export const reviewResponseSchema = envelope(reviewSchema)

export type ReviewBody = z.infer<typeof reviewBodySchema>
export type ReviewUpdateBody = z.infer<typeof reviewUpdateBodySchema>
