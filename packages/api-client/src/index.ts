import type { AppType } from '@ays/api'
import { hc } from 'hono/client'

export type { AppType }

/**
 * Typed RPC client for the API. The package is compiled ahead of time and emits a `.d.ts`,
 * so consumers import one typed entry point instead of wiring `hc<AppType>` themselves.
 */
export const hcWithType = (...args: Parameters<typeof hc>): ReturnType<typeof hc<AppType>> =>
  hc<AppType>(...args)
