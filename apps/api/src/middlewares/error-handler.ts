import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { Logger } from 'pino'

import { dbError, pgError } from '../utils/db-errors'
import { env } from '../utils/env'
import { AppError } from '../utils/errors'
import { debugBody, errorLogEntry } from '../utils/error-log'
import { logger } from '../utils/logger'

type Options = {
  /** Adds `debug` (layer, op, meta, cause, stack) to the body. Development only. */
  debug: boolean
  log?: Pick<Logger, 'warn' | 'error' | 'debug'>
}

/** A thrown value nobody wrapped: database failures still get their proper status, the rest is a 500. */
function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error
  if (pgError(error)) return dbError(error, 'unhandled', undefined, 'route')
  return new AppError(500, 'internal_error', 'Internal server error', {
    layer: 'route',
    op: 'unhandled',
    cause: error,
  })
}

/** The failed query and its parameters, from Drizzle's wrapper; for `debug` level only. */
function failedQuery(error: unknown) {
  let current: unknown = error
  for (let depth = 0; depth < 4 && typeof current === 'object' && current !== null; depth++) {
    const candidate = current as { query?: unknown; params?: unknown; cause?: unknown }
    if (typeof candidate.query === 'string') {
      return { query: candidate.query, params: candidate.params }
    }
    current = candidate.cause
  }
  return undefined
}

/**
 * The one place a failure is logged and answered: a single log entry (warn for known 4xx, error
 * otherwise) and the safe body `{ code, message, requestId }`. Layer, op and meta stay in the log.
 */
export function createErrorHandler({ debug, log = logger }: Options) {
  return (error: Error, c: Context) => {
    const requestId = c.get('requestId') as string | undefined
    if (error instanceof HTTPException) {
      return c.json({ code: 'http_error', message: error.message, requestId }, error.status)
    }
    const failure = toAppError(error)
    const entry = errorLogEntry(failure, { requestId, method: c.req.method, path: c.req.path })
    if (failure.status < 500) log.warn(entry, failure.code)
    else log.error(entry, failure.code)
    const query = failedQuery(error)
    if (query) log.debug({ requestId, ...query }, 'failed query')

    return c.json(
      {
        code: failure.code,
        message: failure.message,
        requestId,
        ...(failure.errors ? { errors: failure.errors } : {}),
        ...(debug ? { debug: debugBody(failure) } : {}),
      },
      failure.status,
    )
  }
}

export const onError = createErrorHandler({ debug: env.NODE_ENV === 'development' })

export function notFound(c: Context) {
  return c.json(
    {
      code: 'not_found',
      message: `Route ${c.req.method} ${c.req.path} not found`,
      requestId: c.get('requestId') as string | undefined,
    },
    404,
  )
}
