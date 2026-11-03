import { describe, expect, it } from 'vitest'

import { consumePendingAction, setPendingAction } from './pending-action'

describe('pending action', () => {
  it('is consumed exactly once', () => {
    setPendingAction({ type: 'add-to-cart', productId: 7, quantity: 2 })
    expect(consumePendingAction()).toEqual({ type: 'add-to-cart', productId: 7, quantity: 2 })
    expect(consumePendingAction()).toBeNull()
  })

  it('ignores corrupt data', () => {
    sessionStorage.setItem('ays-case:v1:pending-action', '{"type":"nope"}')
    expect(consumePendingAction()).toBeNull()
  })
})
