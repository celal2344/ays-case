import { beforeEach, describe, expect, it } from 'vitest'

import { useReviewsStore } from '../store'

const state = () => useReviewsStore.getState()
const input = {
  productId: 1,
  userId: 7,
  authorName: 'Ada Lovelace',
  rating: 4,
  comment: 'Solid product.',
}

beforeEach(() => state().reset())

describe('reviews store', () => {
  it('adds a review with an id and timestamp', () => {
    const review = state().add(input)
    expect(review).toMatchObject({ ...input })
    expect(review?.id).toBeTruthy()
    expect(Date.parse(review?.createdAt ?? '')).not.toBeNaN()
    expect(state().byProduct[1]).toHaveLength(1)
  })

  it('allows one review per user per product, but the same user can review other products', () => {
    expect(state().add(input)).not.toBeNull()
    expect(state().add({ ...input, rating: 1 })).toBeNull()
    expect(state().add({ ...input, productId: 2 })).not.toBeNull()
    expect(state().add({ ...input, userId: 8 })).not.toBeNull()
  })

  it('updates only rating and comment', () => {
    const review = state().add(input)!
    state().update(1, review.id, { rating: 2, comment: 'Changed my mind.' })
    expect(state().byProduct[1]?.[0]).toMatchObject({
      rating: 2,
      comment: 'Changed my mind.',
      userId: 7,
    })
  })

  it('removes a review, hides seeded ones once, and clears a deleted product', () => {
    const review = state().add(input)!
    state().remove(1, review.id)
    expect(state().byProduct[1]).toEqual([])

    state().hideSeeded(1, 'k')
    state().hideSeeded(1, 'k')
    expect(state().hidden[1]).toEqual(['k'])

    state().add(input)
    state().removeProduct(1)
    expect(state().byProduct[1]).toBeUndefined()
    expect(state().hidden[1]).toBeUndefined()
  })

  it('persists under the versioned key', () => {
    state().add(input)
    const saved = JSON.parse(localStorage.getItem('ays-case:v1:reviews') ?? '{}')
    expect(saved.state.byProduct['1']).toHaveLength(1)
    expect(saved.version).toBe(1)
  })
})
