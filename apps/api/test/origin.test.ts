import { describe, expect, it } from 'vitest'

import { resolveOrigins } from '../src/auth/origin'

describe('resolveOrigins', () => {
  it('defaults to the Vite dev server origin locally', () => {
    expect(resolveOrigins({})).toEqual({
      baseURL: 'http://localhost:5173',
      trustedOrigins: ['http://localhost:5173'],
    })
  })

  it('prefers an explicit BETTER_AUTH_URL', () => {
    expect(
      resolveOrigins({ BETTER_AUTH_URL: 'https://example.com', VERCEL_URL: 'x.vercel.app' })
        .baseURL,
    ).toBe('https://example.com')
  })

  it('uses the production domain in production', () => {
    const { baseURL, trustedOrigins } = resolveOrigins({
      VERCEL_ENV: 'production',
      VERCEL_PROJECT_PRODUCTION_URL: 'ayscase.vercel.app',
      VERCEL_URL: 'ayscase-abc123.vercel.app',
    })
    expect(baseURL).toBe('https://ayscase.vercel.app')
    expect(trustedOrigins).toContain('https://ayscase-abc123.vercel.app')
  })

  it('also trusts the branch alias a preview is opened through', () => {
    const { baseURL, trustedOrigins } = resolveOrigins({
      VERCEL_ENV: 'preview',
      VERCEL_URL: 'ayscase-abc123.vercel.app',
      VERCEL_BRANCH_URL: 'ayscase-git-feature.vercel.app',
    })
    expect(baseURL).toBe('https://ayscase-abc123.vercel.app')
    expect(trustedOrigins).toContain('https://ayscase-git-feature.vercel.app')
  })

  it('uses the deployment URL on previews', () => {
    expect(
      resolveOrigins({
        VERCEL_ENV: 'preview',
        VERCEL_URL: 'ayscase-git-feature.vercel.app',
        VERCEL_PROJECT_PRODUCTION_URL: 'ayscase.vercel.app',
      }).baseURL,
    ).toBe('https://ayscase-git-feature.vercel.app')
  })
})
