import type { Review } from '@/features/products/schemas'

import type { LocalReview, ReviewItem, ReviewSort, ReviewSummary } from './schemas'

/** Seeded reviews have no id, so date + email identifies one (used to hide it). */
export function seededKey(review: Pick<Review, 'date' | 'reviewerEmail'>) {
  return `${review.date}|${review.reviewerEmail}`
}

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
      date: r.date,
      authorName: r.reviewerName,
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

export function summarize(reviews: Pick<ReviewItem, 'rating'>[]): ReviewSummary {
  const histogram: ReviewSummary['histogram'] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  let total = 0
  for (const { rating } of reviews) {
    const star = Math.min(5, Math.max(1, Math.round(rating))) as 1 | 2 | 3 | 4 | 5
    histogram[star] += 1
    total += rating
  }
  const count = reviews.length
  return { count, average: count === 0 ? 0 : total / count, histogram }
}
