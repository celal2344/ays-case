import type { ErrorCode, FieldError } from '@ays/validators'

import { dbError, UNAVAILABLE_MESSAGE } from './db-errors'
import { AppError, type ErrorLayer, type ErrorMeta } from './errors'

/**
 * Error helpers for one module and layer, so a call site is one line:
 *
 *   const fail = errorsFor('catalog', 'repository')
 *   throw fail.notFound('findProductDetail', 'Product not found', { id })
 *
 * The recorded `op` is `catalog.repository.findProductDetail`. `message` is for the client, so it
 * never contains values; values go in `meta`, which only the logs see.
 */
export function errorsFor(scope: string, layer: ErrorLayer) {
  const make = (
    status: ConstructorParameters<typeof AppError>[0],
    code: ErrorCode,
    op: string,
    message: string,
    meta?: ErrorMeta,
    extra: { cause?: unknown; errors?: FieldError[] } = {},
  ) => new AppError(status, code, message, { layer, op: `${scope}.${layer}.${op}`, meta, ...extra })

  return {
    badRequest: (op: string, message: string, meta?: ErrorMeta) =>
      make(400, 'bad_request', op, message, meta),
    unauthorized: (op: string, message: string, meta?: ErrorMeta) =>
      make(401, 'unauthorized', op, message, meta),
    forbidden: (op: string, message: string, meta?: ErrorMeta) =>
      make(403, 'forbidden', op, message, meta),
    notFound: (op: string, message: string, meta?: ErrorMeta) =>
      make(404, 'not_found', op, message, meta),
    conflict: (op: string, message: string, meta?: ErrorMeta, code: ErrorCode = 'conflict') =>
      make(409, code, op, message, meta),
    unprocessable: (
      op: string,
      message: string,
      meta?: ErrorMeta,
      code: ErrorCode = 'validation_error',
    ) => make(422, code, op, message, meta),
    /** The database cannot answer right now (503). Prefer `dbError`, which detects this itself. */
    unavailable: (op: string, cause: unknown, meta?: ErrorMeta) =>
      make(503, 'database_unavailable', op, UNAVAILABLE_MESSAGE, meta, { cause }),
    /** Maps a Postgres or driver failure (constraint, bad input, timeout, unreachable). */
    dbError: (op: string, cause: unknown, meta?: ErrorMeta) =>
      dbError(cause, `${scope}.${layer}.${op}`, meta, layer),
    /** Runs a query; any failure that is not already an `AppError` becomes `dbError`. */
    async guard<T>(op: string, run: () => PromiseLike<T>, meta?: ErrorMeta): Promise<T> {
      try {
        return await run()
      } catch (error) {
        throw dbError(error, `${scope}.${layer}.${op}`, meta, layer)
      }
    },
  }
}
