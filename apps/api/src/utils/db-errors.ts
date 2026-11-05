import type { ErrorCode } from '@ays/validators'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

import { AppError, type ErrorLayer, type ErrorMeta } from './errors'

type PgError = {
  code?: string
  constraint_name?: string
  constraint?: string
  detail?: string
  message?: string
}

/** Drizzle wraps the driver error as `cause`; postgres-js and PGlite name the constraint differently. */
export function pgError(error: unknown): PgError | undefined {
  let current: unknown = error
  for (let depth = 0; depth < 4 && typeof current === 'object' && current !== null; depth++) {
    const candidate = current as PgError & { cause?: unknown }
    // an AppError's own `code` is ours, not Postgres's: look at what it wraps
    if (!(current instanceof AppError) && typeof candidate.code === 'string') return candidate
    current = candidate.cause
  }
  return undefined
}

export type DbConflict =
  | { kind: 'duplicate'; constraint: string | undefined }
  | { kind: 'in_use' }
  | { kind: 'missing_reference' }

/** Turns the three constraint failures an admin write can hit into something a route can answer. */
export function toConflict(error: unknown): DbConflict | undefined {
  const pg = pgError(error)
  if (!pg) return undefined
  if (pg.code === '23505')
    return { kind: 'duplicate', constraint: pg.constraint_name ?? pg.constraint }
  // 23503: deleting a row that is still referenced, or pointing at a row that does not exist
  if (pg.code === '23503') {
    return /is still referenced/i.test(pg.detail ?? '')
      ? { kind: 'in_use' }
      : { kind: 'missing_reference' }
  }
  return undefined
}

/** `products_sku_unique` → `sku`, `users_username_unique` → `username`; falls back to the constraint. */
export function duplicateField(constraint: string | undefined) {
  const match = constraint?.match(/(sku|barcode|slug|username|email|name|label)/)
  return match?.[1] ?? 'value'
}

// Network and driver codes (postgres-js and Node) for "could not reach the database".
const UNREACHABLE = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'EPIPE',
  'ENOTFOUND',
  'EAI_AGAIN',
  'CONNECT_TIMEOUT',
  'CONNECTION_CLOSED',
  'CONNECTION_ENDED',
  'CONNECTION_DESTROYED',
  'CONNECTION_REFUSED',
])

/**
 * The database cannot answer right now, which is a "try again" condition and not a bug:
 * unreachable, a failed pooler login, too many connections, a shutdown, or `57014` (a statement
 * timeout or a canceled statement).
 */
function isUnavailable(pg: PgError): boolean {
  const code = pg.code ?? ''
  return (
    UNREACHABLE.has(code) ||
    code === '57014' ||
    code === '28P01' ||
    code === '28000' ||
    code === '53300' ||
    code.startsWith('08') ||
    code.startsWith('57P') ||
    /tenant or user not found/i.test(pg.message ?? '')
  )
}

/**
 * The one place that turns a database failure into an `AppError`: constraint violations to 409 or
 * 422, bad input to 400, availability problems to 503 `database_unavailable` (a "try again", not a
 * bug), anything else to a generic 500. The original error stays as `cause` for the logs.
 */
export function dbError(cause: unknown, op: string, layer: ErrorLayer, meta?: ErrorMeta): AppError {
  if (cause instanceof AppError) return cause
  const make = (status: ContentfulStatusCode, code: ErrorCode, message: string) =>
    new AppError(status, code, message, op, layer, meta, cause)
  const pg = pgError(cause)
  if (pg && isUnavailable(pg)) {
    return make(
      503,
      'database_unavailable',
      'The service is temporarily unavailable. Please try again.',
    )
  }
  const conflict = toConflict(cause)
  if (conflict?.kind === 'duplicate') {
    return make(409, 'conflict', 'A record with this value already exists')
  }
  if (conflict?.kind === 'in_use') return make(409, 'in_use', 'This record is still in use')
  if (conflict?.kind === 'missing_reference') {
    return make(422, 'unknown_reference', 'A referenced record does not exist')
  }
  if (pg?.code === '23514') {
    return make(422, 'validation_error', 'A value is outside the allowed range')
  }
  if (pg?.code === '22P02') return make(400, 'bad_request', 'A value has an invalid format')
  return make(500, 'internal_error', 'Internal server error')
}
