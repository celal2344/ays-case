import { beforeEach, describe, expect, it } from 'vitest'

import {
  consumePendingAction,
  hasPendingAction,
  setPendingAction,
} from '@/features/auth/pending-action'
import { resetDemoData } from '@/features/admin/reset'

import { useFavoritesStore } from '../store'

const ids = (userId: string) => useFavoritesStore.getState().byUser[userId] ?? []

describe('favorites store', () => {
  beforeEach(() => useFavoritesStore.getState().reset())

  it('toggles, newest first, and reports the new state', () => {
    expect(useFavoritesStore.getState().toggle('user-1', 5)).toBe(true)
    expect(useFavoritesStore.getState().toggle('user-1', 9)).toBe(true)
    expect(ids('user-1')).toEqual([9, 5])
    expect(useFavoritesStore.getState().toggle('user-1', 9)).toBe(false)
    expect(ids('user-1')).toEqual([5])
  })

  it('keeps users apart', () => {
    useFavoritesStore.getState().toggle('user-1', 5)
    useFavoritesStore.getState().toggle('user-16', 7)
    expect(ids('user-1')).toEqual([5])
    expect(ids('user-16')).toEqual([7])
  })

  it('removes one favorite, or a deleted product from everyone', () => {
    useFavoritesStore.getState().toggle('user-1', 5)
    useFavoritesStore.getState().toggle('user-16', 5)
    useFavoritesStore.getState().toggle('user-16', 7)
    useFavoritesStore.getState().remove('user-16', 7)
    expect(ids('user-16')).toEqual([5])
    useFavoritesStore.getState().removeProductEverywhere(5)
    expect(ids('user-1')).toEqual([])
    expect(ids('user-16')).toEqual([])
  })

  it('persists under the versioned key and is emptied by Reset demo data', () => {
    useFavoritesStore.getState().toggle('user-1', 5)
    expect(JSON.parse(localStorage.getItem('ays-case:v1:favorites') ?? '{}').version).toBe(1)
    resetDemoData()
    expect(useFavoritesStore.getState().byUser).toEqual({})
  })
})

describe('pending action types', () => {
  it('leaves an action of another type for its owner', () => {
    setPendingAction({ type: 'favorite', productId: 3 })
    expect(hasPendingAction('add-to-cart')).toBe(false)
    expect(consumePendingAction('add-to-cart')).toBeNull()
    expect(hasPendingAction('favorite')).toBe(true)
    expect(consumePendingAction('favorite')).toEqual({ type: 'favorite', productId: 3 })
    expect(hasPendingAction()).toBe(false)
  })
})
