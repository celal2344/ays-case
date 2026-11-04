import { describe, expect, it } from 'vitest'

import type { Review } from '@/features/products/schemas'

import type { LocalReview } from '../schemas'
import { mergeReviews, seededKey, sortReviews } from '../merge'

const seeded = (rating: number, date: string, id = rating): Review => ({
  id,
  rating,
  comment: `comment ${rating}`,
  createdAt: date,
  updatedAt: date,
  author: { id: 'user-5', name: 'Seed Person' },
})

const local = (id: string, rating: number, createdAt: string): LocalReview => ({
  id,
  productId: 1,
  userId: 'user-7',
  authorName: 'Local Person',
  rating,
  comment: 'a local review',
  createdAt,
})

describe('mergeReviews', () => {
  it('combines seeded and local reviews and marks the local ones', () => {
    const merged = mergeReviews(
      [seeded(4, '2025-01-01T00:00:00Z')],
      [local('abc', 2, '2025-02-01T00:00:00Z')],
    )
    expect(merged).toHaveLength(2)
    expect(merged.find((r) => r.local)?.local).toEqual({ id: 'abc', userId: 'user-7' })
    expect(merged.find((r) => !r.local)?.authorName).toBe('Seed Person')
  })

  it('drops seeded reviews whose key was hidden by an admin', () => {
    const review = seeded(4, '2025-01-01T00:00:00Z')
    expect(mergeReviews([review], [], [seededKey(review)])).toEqual([])
  })
})

describe('sortReviews', () => {
  const items = mergeReviews(
    [seeded(3, '2025-03-01T00:00:00Z'), seeded(5, '2025-01-01T00:00:00Z')],
    [local('l1', 1, '2025-02-01T00:00:00Z')],
  )

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
