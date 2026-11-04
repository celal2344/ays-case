import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { isInFlight, runExclusive, useInFlight } from '../in-flight'

describe('runExclusive', () => {
  it('ignores a second call with the same key while the first runs', async () => {
    let release = () => {}
    let calls = 0
    const slow = () =>
      new Promise<string>((resolve) => {
        calls += 1
        release = () => resolve('done')
      })
    const first = runExclusive('k', slow)
    const second = await runExclusive('k', slow)
    expect(second).toBeUndefined()
    expect(calls).toBe(1)
    release()
    expect(await first).toBe('done')
    expect(isInFlight('k')).toBe(false)
  })

  it('lets different keys run together and releases the key after a failure', async () => {
    await expect(runExclusive('a', () => Promise.reject(new Error('boom')))).rejects.toThrow('boom')
    expect(isInFlight('a')).toBe(false)
    expect(await runExclusive('a', () => Promise.resolve(1))).toBe(1)
  })

  it('tells components while the key is running', async () => {
    const { result } = renderHook(() => useInFlight('p'))
    expect(result.current).toBe(false)
    let release = () => {}
    let run: Promise<unknown> = Promise.resolve()
    act(() => {
      run = runExclusive('p', () => new Promise<void>((resolve) => (release = resolve)))
    })
    expect(result.current).toBe(true)
    await act(async () => {
      release()
      await run
    })
    expect(result.current).toBe(false)
  })
})
