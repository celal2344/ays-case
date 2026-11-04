import { describe, expect, it } from 'vitest'

import type { Review } from '@/features/products/schemas'

import type { LocalReview } from '../schemas'
import { mergeReviews, seededKey, sortReviews, summarize } from '../summary'

const seeded = (rating: number, date: string, email = 'a@x.com'): Review => ({
  rating,
  comment: `comment ${rating}`,
  date,
  reviewerName: 'Seed Person',
  reviewerEmail: email,
})

const local = (id: string, rating: number, createdAt: string): LocalReview => ({
  id,
  productId: 1,
  userId: 7,
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
    expect(merged.find((r) => r.local)?.local).toEqual({ id: 'abc', userId: 7 })
    expect(merged.find((r) => !r.local)?.authorName).toBe('Seed Person')
  })

  it('drops seeded reviews whose key was hidden by an admin', () => {
    const review = seeded(4, '2025-01-01T00:00:00Z')
    expect(mergeReviews([review], [], [seededKey(review)])).toEqual([])
  })
})

describe('sortReviews', () => {
  const items = mergeReviews(
    [seeded(3, '2025-03-01T00:00:00Z', 'a@x.com'), seeded(5, '2025-01-01T00:00:00Z', 'b@x.com')],
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

describe('summarize', () => {
  it('returns zeros for no reviews', () => {
    expect(summarize([])).toEqual({
      count: 0,
      average: 0,
      histogram: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    })
  })

  it('averages and builds the 5→1 histogram', () => {
    const summary = summarize([{ rating: 5 }, { rating: 5 }, { rating: 4 }, { rating: 1 }])
    expect(summary.count).toBe(4)
    expect(summary.average).toBeCloseTo(3.75)
    expect(summary.histogram).toEqual({ 1: 1, 2: 0, 3: 0, 4: 1, 5: 2 })
  })

  it('clamps odd ratings into 1–5', () => {
    expect(summarize([{ rating: 0 }, { rating: 9 }]).histogram).toEqual({
      1: 1,
      2: 0,
      3: 0,
      4: 0,
      5: 1,
    })
  })
})
