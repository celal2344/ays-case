import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'

import { dbError, pgError } from '../utils/db-errors'
import { AppError } from '../utils/errors'
import { logger, serializeErr } from '../utils/logger'

const SECRET_KEY = /password|token|secret|authorization|cookie|email/i

/** Masks values whose key looks like a secret or personal data. */
function redact(value: unknown, depth = 0): unknown {
  if (typeof value !== 'object' || value === null) return value
  if (depth > 3) return '[truncated]'
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1))
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      SECRET_KEY.test(key) ? '[redacted]' : redact(item, depth + 1),
    ]),
  )
}

/**
 * The one place a failure is logged and answered: one log entry (warn for 4xx, error otherwise)
 * and the safe body `{ code, message, requestId }`. Layer, op and meta stay in the log; in
 * development the body also carries them as `debug`. An error nobody wrapped still gets its proper
 * status when it comes from Postgres (a timeout is a 503); anything else is a generic 500.
 */
export function onError(error: Error, c: Context) {
  const requestId = c.get('requestId') as string | undefined
  if (error instanceof HTTPException) {
    return c.json({ code: 'http_error', message: error.message, requestId }, error.status)
  }
  const failure = error instanceof AppError ? error : unwrapped(error)
  const meta = redact(failure.meta)
  const entry = {
    code: failure.code,
    status: failure.status,
    op: failure.op,
    meta,
    requestId,
    method: c.req.method,
    path: c.req.path,
    err: failure,
  }
  if (failure.status < 500) logger.warn(entry, failure.code)
  else logger.error(entry, failure.code)

  // read at call time so it follows the environment the process was started with
  const debug =
    process.env.NODE_ENV === 'development'
      ? { debug: { op: failure.op, meta, ...splitStack(failure) } }
      : {}
  return c.json(
    { code: failure.code, message: failure.message, requestId, ...debug },
    failure.status,
  )
}

function unwrapped(error: unknown) {
  if (pgError(error)) return dbError(error, 'unhandled')
  return new AppError(500, 'internal_error', 'Internal server error', 'unhandled', {}, error)
}

function splitStack(failure: AppError) {
  const { stack, ...cause } = serializeErr(failure)
  return { cause, stack }
}

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
