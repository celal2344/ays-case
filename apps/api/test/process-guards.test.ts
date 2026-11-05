import { describe, expect, it } from 'vitest'

import { installProcessGuards } from '../src/utils/process-guards'

describe('installProcessGuards', () => {
  it('handles unhandled rejections and uncaught exceptions once, however many times it is called', () => {
    const rejections = process.listenerCount('unhandledRejection')
    const exceptions = process.listenerCount('uncaughtException')
    installProcessGuards()
    installProcessGuards()
    expect(process.listenerCount('unhandledRejection')).toBe(rejections + 1)
    expect(process.listenerCount('uncaughtException')).toBe(exceptions + 1)
  })

  it('does not throw when a rejection or an exception reaches it', () => {
    installProcessGuards()
    expect(() =>
      process.emit('unhandledRejection', new Error('canceling statement'), Promise.resolve()),
    ).not.toThrow()
    expect(() => process.emit('uncaughtException', new Error('boom'))).not.toThrow()
  })
})
