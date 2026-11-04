import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'

import { AppError } from '../utils/errors'
import { logger } from '../utils/logger'

export function onError(error: Error, c: Context) {
  if (error instanceof AppError) {
    return c.json({ code: error.code, message: error.message }, error.status)
  }
  if (error instanceof HTTPException) {
    return c.json({ code: 'http_error', message: error.message }, error.status)
  }
  logger.error({ err: error }, 'unhandled error')
  return c.json({ code: 'internal_error', message: 'Internal server error' }, 500)
}

export function notFound(c: Context) {
  return c.json(
    { code: 'not_found', message: `Route ${c.req.method} ${c.req.path} not found` },
    404,
  )
}
