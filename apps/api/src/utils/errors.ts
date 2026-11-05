import { errorStatus, type ErrorCode } from '@ays/validators'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

export type ErrorLayer = 'route' | 'service' | 'repo' | 'middleware'

/** Plain values for the logs only: never part of `message`, never sent to the client. */
export type ErrorMeta = Record<string, unknown>

/**
 * A failure with a stable `code` and a client-safe `message`, plus where it happened (`layer`,
 * `op`) and the errored values (`meta`) for the logs. The client only sees code, message and
 * request id.
 */
export class AppError extends Error {
  readonly status: ContentfulStatusCode
  readonly code: ErrorCode
  readonly op: string
  readonly layer: ErrorLayer
  readonly meta: ErrorMeta

  constructor(
    status: ContentfulStatusCode,
    code: ErrorCode,
    message: string,
    op: string,
    layer: ErrorLayer,
    meta: ErrorMeta = {},
    cause?: unknown,
  ) {
    super(message, cause === undefined ? undefined : { cause })
    this.name = 'AppError'
    this.status = status
    this.code = code
    this.op = op
    this.layer = layer
    this.meta = meta
  }
}

/**
 * The one way to fail on purpose; the status comes from the code:
 *
 *   throw appError('not_found', 'Product not found', 'catalog.getProduct', 'repo', { id })
 *
 * `message` is for the client, so it never contains values; values go in `meta`.
 */
export function appError(
  code: ErrorCode,
  message: string,
  op: string,
  layer: ErrorLayer,
  meta?: ErrorMeta,
) {
  return new AppError(errorStatus[code], code, message, op, layer, meta)
}
