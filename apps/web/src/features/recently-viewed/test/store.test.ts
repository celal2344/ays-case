import { describe, expect, it } from 'vitest'

import { MAX_RECENTLY_VIEWED, useRecentlyViewedStore } from '../store'

const s = () => useRecentlyViewedStore.getState()

describe('recently viewed store', () => {
  it('puts the newest first and moves a revisit to the front without duplicates', () => {
    s().record('1', 5)
    s().record('1', 6)
    s().record('1', 5)
    expect(s().byUser['1']).toEqual([5, 6])
  })

  it('keeps at most 12', () => {
    for (let id = 1; id <= MAX_RECENTLY_VIEWED + 3; id++) s().record('1', id)
    expect(s().byUser['1']).toHaveLength(MAX_RECENTLY_VIEWED)
    expect(s().byUser['1']![0]).toBe(MAX_RECENTLY_VIEWED + 3)
  })

  it('keeps lists per user and the guest apart, and clears one list', () => {
    s().record('1', 5)
    s().record('guest', 7)
    s().clear('1')
    expect(s().byUser).toEqual({ '1': [], guest: [7] })
  })

  it('removeProductEverywhere and reset', () => {
    s().record('1', 5)
    s().record('guest', 5)
    s().record('guest', 6)
    s().removeProductEverywhere(5)
    expect(s().byUser).toEqual({ '1': [], guest: [6] })
    s().reset()
    expect(s().byUser).toEqual({})
  })
})
