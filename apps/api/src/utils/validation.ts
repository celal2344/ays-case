import type { FieldError } from '@ays/validators'
import type { Context } from 'hono'

type Issue = { path?: ReadonlyArray<PropertyKey | { key: PropertyKey }>; message: string }

export function toFieldErrors(issues: ReadonlyArray<Issue>): FieldError[] {
  return issues.map((issue) => ({
    field: (issue.path ?? [])
      .map((segment) => String(typeof segment === 'object' ? segment.key : segment))
      .join('.'),
    message: issue.message,
  }))
}

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
      errors: toFieldErrors(result.error ?? []),
    },
    422,
  )
}
