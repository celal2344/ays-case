import { describe, expect, it } from 'vitest'

import { migrateUserId, migrateUserKeys, readJson, storageKey, writeJson } from '../storage'

describe('storage', () => {
  it('prefixes keys with the app name and version', () => {
    expect(storageKey('prefs')).toBe('ays-case:v1:prefs')
  })

  it('round-trips JSON values', () => {
    writeJson('k', { a: 1 })
    expect(readJson('k', null)).toEqual({ a: 1 })
  })

  it('returns the fallback for missing or corrupt values', () => {
    expect(readJson('missing', 42)).toBe(42)
    localStorage.setItem('bad', '{oops')
    expect(readJson('bad', 'fallback')).toBe('fallback')
  })
})

describe('migrateUserId / migrateUserKeys', () => {
  it('maps DummyJSON numeric ids to the API ids and drops ids from the old local overlay', () => {
    expect(migrateUserId(16)).toBe('user-16')
    expect(migrateUserId('16')).toBe('user-16')
    expect(migrateUserId(100_000)).toBeNull()
    expect(migrateUserId('guest')).toBe('guest')
    expect(migrateUserId('user-3')).toBe('user-3')
  })

  it('applies that to the keys of a record', () => {
    expect(migrateUserKeys({ '1': [1], '100001': [2], guest: [3] })).toEqual({
      'user-1': [1],
      guest: [3],
    })
    expect(migrateUserKeys(undefined)).toEqual({})
  })
})
