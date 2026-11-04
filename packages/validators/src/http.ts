import { z } from 'zod'

export const fieldErrorSchema = z.object({ field: z.string(), message: z.string() })

export const errorSchema = z.object({
  code: z.string(),
  message: z.string(),
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
