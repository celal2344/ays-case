import type { Review } from '@/features/products/schemas'

import type { LocalReview, ReviewItem, ReviewSort } from './schemas'

/** API reviews have a stable id, so it identifies one (used to hide it). */
export const seededKey = (review: Pick<Review, 'id'>) => `api-${review.id}`

export function mergeReviews(
  seeded: Review[],
  local: LocalReview[],
  hiddenKeys: string[] = [],
): ReviewItem[] {
  const hidden = new Set(hiddenKeys)
  const fromSeed: ReviewItem[] = seeded
    .filter((r) => !hidden.has(seededKey(r)))
    .map((r) => ({
      key: seededKey(r),
      rating: r.rating,
      comment: r.comment,
      date: r.createdAt,
      authorName: r.author.name,
    }))
  const fromLocal: ReviewItem[] = local.map((r) => ({
    key: r.id,
    rating: r.rating,
    comment: r.comment,
    date: r.createdAt,
    authorName: r.authorName,
    local: { id: r.id, userId: r.userId },
  }))
  return [...fromLocal, ...fromSeed]
}

export function sortReviews(reviews: ReviewItem[], sort: ReviewSort): ReviewItem[] {
  const byNewest = (a: ReviewItem, b: ReviewItem) => Date.parse(b.date) - Date.parse(a.date)
  return [...reviews].sort((a, b) => {
    if (sort === 'highest') return b.rating - a.rating || byNewest(a, b)
    if (sort === 'lowest') return a.rating - b.rating || byNewest(a, b)
    return byNewest(a, b)
  })
}
