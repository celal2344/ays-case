import { z } from 'zod'

export const fieldErrorSchema = z.object({ field: z.string(), message: z.string() })

/** Every `code` the API can answer with, and the HTTP status it goes with. */
export const errorStatus = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  duplicate: 409,
  in_use: 409,
  unknown_reference: 422,
  cannot_delete_self: 409,
  cannot_demote_self: 409,
  last_admin: 409,
  cart_empty: 422,
  out_of_stock: 409,
  insufficient_stock: 409,
  product_unavailable: 409,
  review_exists: 409,
  validation_error: 422,
  // answered from an HTTPException, whose status varies; never thrown with the helper
  http_error: 500,
  internal_error: 500,
  database_unavailable: 503,
} as const

export type ErrorCode = keyof typeof errorStatus
export const errorCodes = Object.keys(errorStatus) as [ErrorCode, ...ErrorCode[]]

export const errorCodeSchema = z.enum(errorCodes)

/** The one error body. `layer`, `op` and `meta` never appear here; they are for the logs. */
export const errorSchema = z.object({
  code: errorCodeSchema,
  message: z.string(),
  requestId: z.string().optional(),
  errors: z.array(fieldErrorSchema).optional(),
})

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const paginationMetaSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
})

export function envelope<T extends z.ZodType>(data: T) {
  return z.object({ data })
}

export function paginated<T extends z.ZodType>(item: T) {
  return z.object({ data: z.array(item), meta: paginationMetaSchema })
}

export type FieldError = z.infer<typeof fieldErrorSchema>
export type ApiError = z.infer<typeof errorSchema>
export type PaginationQuery = z.infer<typeof paginationQuerySchema>
export type PaginationMeta = z.infer<typeof paginationMetaSchema>
