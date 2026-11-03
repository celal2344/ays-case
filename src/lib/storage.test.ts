import { describe, expect, it } from 'vitest'

import { readJson, storageKey, writeJson } from './storage'

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
