import { z } from 'zod'

export const fieldErrorSchema = z.object({ field: z.string(), message: z.string() })

/** Every `code` the API can answer with. The web narrows on it and maps it to translated text. */
export const errorCodes = [
  'bad_request',
  'unauthorized',
  'forbidden',
  'not_found',
  'conflict',
  'duplicate',
  'in_use',
  'unknown_reference',
  'cannot_delete_self',
  'cannot_demote_self',
  'last_admin',
  'cart_empty',
  'out_of_stock',
  'insufficient_stock',
  'product_unavailable',
  'review_exists',
  'validation_error',
  'http_error',
  'internal_error',
  'database_unavailable',
] as const

export const errorCodeSchema = z.enum(errorCodes)

/** The one error body. `layer`, `op` and `meta` never appear here; they are for the logs. */
export const errorSchema = z.object({
  code: errorCodeSchema,
  message: z.string(),
  requestId: z.string().optional(),
  errors: z.array(fieldErrorSchema).optional(),
  details: z.record(z.string(), z.unknown()).optional(),
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
export type ErrorCode = (typeof errorCodes)[number]
export type ApiError = z.infer<typeof errorSchema>
export type PaginationQuery = z.infer<typeof paginationQuerySchema>
export type PaginationMeta = z.infer<typeof paginationMetaSchema>
