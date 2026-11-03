import { z } from 'zod'

const DEFAULT_API_BASE_URL = 'https://dummyjson.com'

// A missing or malformed value must never take the whole app down at import time (a blank page),
// so it falls back to DummyJSON, the only backend this app talks to.
const envSchema = z.object({
  VITE_API_BASE_URL: z.url().catch(DEFAULT_API_BASE_URL),
})

export const env = envSchema.parse(import.meta.env)
