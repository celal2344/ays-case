import { z } from 'zod'

import { GROUP_IDS } from './category-groups'

// The API's own types (shared validators) are the only product types: no second interface, no mapper.
export type { Category, Product, ProductDetail, Review } from '@ays/validators'

export const productSortSchema = z.enum(['price', 'rating', 'title', 'discount', 'newest'])
export type ProductSort = z.infer<typeof productSortSchema>
export type SortOrder = 'asc' | 'desc'

/**
 * URL state of the shop list. `undefined` always means "default", so defaults never appear in the URL
 * and a malformed value falls back to the default instead of breaking the page.
 */
export const productSearchSchema = z.object({
  q: z.string().optional().catch(undefined),
  category: z.string().optional().catch(undefined),
  sort: productSortSchema.optional().catch(undefined),
  order: z.enum(['asc', 'desc']).optional().catch(undefined),
  page: z.coerce.number().int().min(2).optional().catch(undefined),
  view: z.enum(['grid', 'table']).optional().catch(undefined),
  minPrice: z.coerce.number().min(0).optional().catch(undefined),
  maxPrice: z.coerce.number().min(0).optional().catch(undefined),
  group: z.enum(GROUP_IDS).optional().catch(undefined),
  brand: z.string().optional().catch(undefined),
  /** Minimum rating (stars), 1 to 4. */
  rating: z.coerce.number().int().min(1).max(4).optional().catch(undefined),
})
export type ProductSearch = z.infer<typeof productSearchSchema>
