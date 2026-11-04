import type { ReviewItem, ReviewSort } from './schemas'

export function sortReviews(reviews: ReviewItem[], sort: ReviewSort): ReviewItem[] {
  const byNewest = (a: ReviewItem, b: ReviewItem) => Date.parse(b.date) - Date.parse(a.date)
  return [...reviews].sort((a, b) => {
    if (sort === 'highest') return b.rating - a.rating || byNewest(a, b)
    if (sort === 'lowest') return a.rating - b.rating || byNewest(a, b)
    return byNewest(a, b)
  })
}
