import { DrizzleQueryError } from 'drizzle-orm'

import { pgError } from './db-errors'
import { AppError, type ErrorMeta } from './errors'

export type SerializedErr = { name: string; message: string; pgCode?: string; stack?: string }

const MAX_FRAMES = 8
const SECRET_KEY = /password|token|secret|authorization|cookie|email/i

/** Drizzle's wrapper carries the whole query (SQL and parameters) in its message. */
function unwrap(error: unknown): unknown {
  let current = error
  for (let depth = 0; depth < 4; depth++) {
    const inner = (current as { cause?: unknown } | null)?.cause
    const wrapper = current instanceof AppError || current instanceof DrizzleQueryError
    if (!wrapper || inner === undefined) return current
    current = inner
  }
  return current
}

/**
 * The `err` serializer: name, message, the Postgres code when there is one, and one short stack.
 * It looks through our own wrapper and Drizzle's, and never prints SQL text or bound parameters.
 */
export function serializeErr(error: unknown): SerializedErr {
  const target = unwrap(error)
  if (!(target instanceof Error)) return { name: 'NonError', message: String(target) }
  const leaksQuery = target instanceof DrizzleQueryError || /^Failed query:/.test(target.message)
  const message = leaksQuery ? 'Database query failed' : target.message
  const all = (target.stack ?? '').split('\n').filter((line) => /^\s+at /.test(line))
  // our helper internals and dependencies are noise in the block; keep them only if nothing else is left
  const own = all.filter((line) => !/error-helpers|node_modules/.test(line))
  const frames = (own.length > 0 ? own : all).slice(0, MAX_FRAMES)
  const pgCode = pgError(target)?.code
  return {
    name: target.name,
    message,
    ...(pgCode === undefined ? {} : { pgCode }),
    stack: [`${target.name}: ${message}`, ...frames].join('\n'),
  }
}

/** Masks values whose key looks like a secret or personal data (password, token, email, ...). */
export function redactMeta(value: unknown, depth = 0): unknown {
  if (Array.isArray(value))
    return depth > 3 ? '[truncated]' : value.map((v) => redactMeta(v, depth + 1))
  if (typeof value !== 'object' || value === null) return value
  if (depth > 3) return '[truncated]'
  return Object.fromEntries(
    Object.entries(value).map(([key, inner]) => [
      key,
      SECRET_KEY.test(key) ? '[redacted]' : redactMeta(inner, depth + 1),
    ]),
  )
}

type Request = { requestId: string | undefined; method: string; path: string }

/** The one entry logged per failed request. No SQL, no parameters, one stack. */
export function errorLogEntry(error: AppError, request: Request) {
  return {
    code: error.code,
    status: error.status,
    layer: error.layer,
    op: error.op,
    meta: redactMeta(error.meta) as ErrorMeta,
    requestId: request.requestId,
    method: request.method,
    path: request.path,
    err: error,
  }
}

/** The development-only `debug` object in the error body. */
export function debugBody(error: AppError) {
  const { stack, ...cause } = serializeErr(error)
  return {
    layer: error.layer,
    op: error.op,
    meta: redactMeta(error.meta) as ErrorMeta,
    cause,
    stack,
  }
}
