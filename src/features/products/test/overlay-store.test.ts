import { beforeEach, describe, expect, it } from 'vitest'

import { productInput } from '@/test/fixtures/products'

import { FIRST_LOCAL_ID, isLocal, useProductOverlayStore } from '../overlay-store'

const state = () => useProductOverlayStore.getState()
const input = productInput()

beforeEach(() => state().reset())

describe('product overlay store', () => {
  it('creates products with sequential local ids from 100000', () => {
    const a = state().create(input)
    const b = state().create(input)
    expect([a.id, b.id]).toEqual([FIRST_LOCAL_ID, FIRST_LOCAL_ID + 1])
    expect(isLocal(a.id)).toBe(true)
    expect(isLocal(194)).toBe(false)
    expect(Object.keys(state().created)).toHaveLength(2)
  })

  it('updates created products in place and remote products through patches', () => {
    const local = state().create(input)
    state().update(local.id, { price: 5 })
    state().update(7, { price: 9 })
    state().update(7, { stock: 1 })
    expect(state().created[local.id]?.price).toBe(5)
    expect(state().patched[7]).toEqual({ price: 9, stock: 1 })
  })

  it('removing a remote product hides it and drops its patch; removing a local one deletes it', () => {
    state().update(7, { price: 9 })
    state().remove(7)
    expect(state().deleted).toEqual([7])
    expect(state().patched[7]).toBeUndefined()

    const local = state().create(input)
    state().remove(local.id)
    expect(state().created[local.id]).toBeUndefined()
    expect(state().deleted).toEqual([7])
  })

  it('decrements stock from the merged stock the caller passes, never below zero', () => {
    const local = state().create({ ...input, stock: 5 })
    state().decrementStock([
      { id: local.id, quantity: 2, stock: 5 },
      { id: 7, quantity: 10, stock: 4 },
    ])
    expect(state().created[local.id]?.stock).toBe(3)
    expect(state().patched[7]?.stock).toBe(0)
  })

  it('reset restores a clean overlay, including the id counter', () => {
    state().create(input)
    state().remove(7)
    state().reset()
    expect(state()).toMatchObject({
      created: {},
      patched: {},
      deleted: [],
      nextLocalId: FIRST_LOCAL_ID,
    })
  })

  it('persists under the versioned key', () => {
    state().update(7, { price: 9 })
    const saved = JSON.parse(localStorage.getItem('ays-case:v1:product-overlay') ?? '{}')
    expect(saved.state.patched).toEqual({ '7': { price: 9 } })
    expect(saved.version).toBe(1)
  })
})
