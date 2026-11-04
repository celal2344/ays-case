import type { ErrorCode, FieldError } from '@ays/validators'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

export type ErrorLayer = 'route' | 'service' | 'repository' | 'middleware'

/** Plain values for the logs only: never part of `message`, never sent to the client. */
export type ErrorMeta = Record<string, unknown>

export type ErrorContext = {
  layer: ErrorLayer
  /** A plain string constant such as `catalog.repository.findProductDetail`; no stack parsing. */
  op: string
  meta?: ErrorMeta | undefined
  /** The original error, when this one wraps it. */
  cause?: unknown
  /** Field errors for a validation answer. */
  errors?: FieldError[] | undefined
}

/**
 * A failure with a stable `code` and a client-safe `message`, plus where it happened (`layer`,
 * `op`) and the errored values (`meta`) for the logs. The client only sees code, message and
 * request id.
 */
export class AppError extends Error {
  readonly status: ContentfulStatusCode
  readonly code: ErrorCode
  readonly layer: ErrorLayer
  readonly op: string
  readonly meta: ErrorMeta
  readonly errors: FieldError[] | undefined

  constructor(
    status: ContentfulStatusCode,
    code: ErrorCode,
    message: string,
    context: ErrorContext,
  ) {
    super(message, context.cause === undefined ? undefined : { cause: context.cause })
    this.name = 'AppError'
    this.status = status
    this.code = code
    this.layer = context.layer
    this.op = context.op
    this.meta = context.meta ?? {}
    this.errors = context.errors
  }
}
