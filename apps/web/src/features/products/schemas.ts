import type { Availability } from '@ays/validators'
import { z } from 'zod'

import { GROUP_IDS } from './category-groups'

/** What the shop needs of a product, built from the API's catalog shape in api.ts. */
export interface Product {
  id: number
  title: string
  description: string
  /** Category slug. */
  category: string
  /** Dollars. The API sends integer cents; api.ts converts once at the boundary. */
  price: number
  discountPercentage: number
  /** Average of the reviews, computed by the API; null while a product has none. */
  rating: number | null
  reviewCount: number
  stock: number
  /** Brand name; some products have none. */
  brand?: string
  thumbnail: string
  /** Derived by the API from stock and the product's low-stock threshold. */
  availability: Availability
  minimumOrderQuantity: number
  lowStockThreshold: number
  /** Tag slugs. */
  tags: string[]
}

export interface Review {
  id: number
  rating: number
  comment: string
  date: string
  reviewerName: string
}

/** Review counts per star, computed by the API. */
export type RatingHistogram = Record<1 | 2 | 3 | 4 | 5, number>

/** GET /products/{id}: the catalog fields plus gallery, specs, policies and reviews. */
export interface ProductDetail extends Product {
  images: string[]
  sku?: string
  /** Kilograms, converted from the API's grams for display. */
  weight?: number
  /** Centimetres, converted from the API's millimetres for display. */
  dimensions?: { width: number; height: number; depth: number }
  warrantyInformation?: string
  shippingInformation?: string
  returnPolicy?: string
  reviews: Review[]
  ratingHistogram?: RatingHistogram
}

export interface Category {
  slug: string
  name: string
}

export const productSortSchema = z.enum(['price', 'rating', 'title'])
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
