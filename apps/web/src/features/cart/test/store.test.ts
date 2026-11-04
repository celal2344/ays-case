import { beforeEach, describe, expect, it } from 'vitest'

import { useCartStore } from '../store'

const state = () => useCartStore.getState()

beforeEach(() => useCartStore.setState({ byUser: {} }))

describe('cart store', () => {
  it('CART-1: adding an existing product increments its quantity', () => {
    state().add('user-1', 10, 1, 50)
    state().add('user-1', 10, 2, 50)
    expect(state().byUser['user-1']).toEqual([
      expect.objectContaining({ productId: 10, quantity: 3 }),
    ])
  })

  it('CART-1: never goes above stock, and does nothing for out-of-stock products', () => {
    expect(state().add('user-1', 10, 3, 4)).toBe(3)
    expect(state().add('user-1', 10, 5, 4)).toBe(4)
    expect(state().add('user-1', 11, 1, 0)).toBe(0)
    expect(state().byUser['user-1']?.map((l) => l.productId)).toEqual([10])
  })

  it('CART-2: setQuantity clamps to 1…stock and ignores garbage', () => {
    state().add('user-1', 10, 1, 8)
    expect(state().setQuantity('user-1', 10, 99, 8)).toBe(8)
    expect(state().setQuantity('user-1', 10, 0, 8)).toBe(1)
    expect(state().setQuantity('user-1', 10, -5, 8)).toBe(1)
    expect(state().setQuantity('user-1', 10, Number.NaN, 8)).toBe(1)
    expect(state().setQuantity('user-1', 10, 3.7, 8)).toBe(3)
    expect(state().byUser['user-1']?.[0]?.quantity).toBe(3)
  })

  it('CART-3: removes one line or clears the cart', () => {
    state().add('user-1', 10, 1, 5)
    state().add('user-1', 11, 1, 5)
    state().remove('user-1', 10)
    expect(state().byUser['user-1']?.map((l) => l.productId)).toEqual([11])
    state().clear('user-1')
    expect(state().byUser['user-1']).toEqual([])
  })

  it('CART-4: carts are isolated per user', () => {
    state().add('user-1', 10, 2, 5)
    state().add('user-2', 10, 1, 5)
    state().clear('user-1')
    expect(state().byUser['user-1']).toEqual([])
    expect(state().byUser['user-2']?.[0]?.quantity).toBe(1)
  })

  it('removeProductEverywhere drops a product from every cart', () => {
    state().add('user-1', 10, 1, 5)
    state().add('user-2', 10, 1, 5)
    state().add('user-2', 11, 1, 5)
    state().removeProductEverywhere(10)
    expect(state().byUser['user-1']).toEqual([])
    expect(state().byUser['user-2']?.map((l) => l.productId)).toEqual([11])
  })

  it('CART-4: persists per user under the versioned key', () => {
    state().add('user-7', 10, 2, 5)
    const saved = JSON.parse(localStorage.getItem('ays-case:v1:cart') ?? '{}')
    expect(saved.state.byUser['user-7'][0]).toMatchObject({ productId: 10, quantity: 2 })
    expect(saved.version).toBe(2)
  })
})
