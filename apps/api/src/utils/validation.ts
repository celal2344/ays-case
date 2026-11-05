import type { FieldError } from '@ays/validators'
import type { Context } from 'hono'
import { z } from 'zod'

type Issue = { path?: ReadonlyArray<PropertyKey | { key: PropertyKey }>; message: string }

export function toFieldErrors(issues: ReadonlyArray<Issue>): FieldError[] {
  return issues.map((issue) => ({
    field: (issue.path ?? [])
      .map((segment) => String(typeof segment === 'object' ? segment.key : segment))
      .join('.'),
    message: issue.message,
  }))
}

/** `/:productId` in the cart, favorites and recently viewed routes. */
export const productIdParam = z.object({ productId: z.coerce.number().int().positive() })

/** Hook for `validator()`: answers every validation failure in the one error shape. */
export function validationHook(
  result: { success: boolean; error?: ReadonlyArray<Issue> },
  c: Context,
) {
  if (result.success) return undefined
  return c.json(
    {
      code: 'validation_error',
      message: 'Request validation failed',
      requestId: c.get('requestId') as string | undefined,
      errors: toFieldErrors(result.error ?? []),
    },
    422,
  )
}
