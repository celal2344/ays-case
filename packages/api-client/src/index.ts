import type { AppType } from '@ays/api'
import { hc } from 'hono/client'

export type { AppType }

/** The API is served under /api on the same origin as the web app, in production and in dev. */
export const API_BASE_URL = '/api'

/**
 * Typed RPC client for the API. The package is compiled ahead of time and emits a `.d.ts`,
 * so consumers import one typed entry point instead of wiring `hc<AppType>` themselves.
 */
export const hcWithType = (...args: Parameters<typeof hc>): ReturnType<typeof hc<AppType>> =>
  hc<AppType>(...args)
