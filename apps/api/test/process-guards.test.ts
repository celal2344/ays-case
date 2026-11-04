import { describe, expect, it } from 'vitest'

import { installProcessGuards } from '../src/utils/process-guards'

describe('installProcessGuards', () => {
  it('handles unhandled rejections once, however many times it is called', () => {
    const before = process.listenerCount('unhandledRejection')
    installProcessGuards()
    installProcessGuards()
    expect(process.listenerCount('unhandledRejection')).toBe(before + 1)
  })

  it('does not throw when a rejection reaches it', () => {
    installProcessGuards()
    expect(() =>
      process.emit('unhandledRejection', new Error('canceling statement'), Promise.resolve()),
    ).not.toThrow()
  })
})
