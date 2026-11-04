import { describe, expect, it } from 'vitest'

import type { ReviewItem } from '../schemas'
import { sortReviews } from '../sort'

const item = (id: number, rating: number, date: string): ReviewItem => ({
  key: String(id),
  id,
  rating,
  comment: `comment ${id}`,
  date,
  authorId: `user-${id}`,
  authorName: 'Someone',
  verifiedBuyer: false,
})

describe('sortReviews', () => {
  const items = [
    item(1, 3, '2025-03-01T00:00:00Z'),
    item(2, 5, '2025-01-01T00:00:00Z'),
    item(3, 1, '2025-02-01T00:00:00Z'),
  ]

  it('newest first', () => {
    expect(sortReviews(items, 'newest').map((r) => r.rating)).toEqual([3, 1, 5])
  })
  it('highest rating first, ties by date', () => {
    expect(sortReviews(items, 'highest').map((r) => r.rating)).toEqual([5, 3, 1])
  })
  it('lowest rating first', () => {
    expect(sortReviews(items, 'lowest').map((r) => r.rating)).toEqual([1, 3, 5])
  })
  it('does not mutate its input', () => {
    const copy = [...items]
    sortReviews(items, 'lowest')
    expect(items).toEqual(copy)
  })
})
