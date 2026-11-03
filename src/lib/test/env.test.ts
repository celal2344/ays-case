import { afterEach, describe, expect, it, vi } from 'vitest'

describe('env', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('uses VITE_API_BASE_URL when it is a valid URL', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://example.test')
    vi.resetModules()
    expect((await import('../env')).env.VITE_API_BASE_URL).toBe('https://example.test')
  })

  it.each(['', 'not a url'])(
    'falls back to DummyJSON instead of crashing for %j',
    async (value) => {
      vi.stubEnv('VITE_API_BASE_URL', value)
      vi.resetModules()
      expect((await import('../env')).env.VITE_API_BASE_URL).toBe('https://dummyjson.com')
    },
  )
})
