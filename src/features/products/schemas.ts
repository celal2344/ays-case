import { z } from 'zod'

import { GROUP_IDS } from './category-groups'

// Derived by hand from dummyjson.json (Product, ProductList, Category). The spec has no `required`
// lists, so the fields the app depends on are required here; `brand` really is missing on some items.

/** The fields loaded for every product in the catalog (`select=` in `api.ts`). */
export const productSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  price: z.number(),
  discountPercentage: z.number(),
  rating: z.number(),
  stock: z.number().int(),
  brand: z.string().optional(),
  thumbnail: z.string(),
  availabilityStatus: z.string().optional(),
  minimumOrderQuantity: z.number().int().optional(),
  tags: z.array(z.string()).default([]),
})
export type Product = z.infer<typeof productSchema>

export const reviewSchema = z.object({
  rating: z.number(),
  comment: z.string(),
  date: z.string(),
  reviewerName: z.string(),
  reviewerEmail: z.string(),
})
export type Review = z.infer<typeof reviewSchema>

/** `GET /products/{id}`: the catalog fields plus gallery, specs, policies and reviews. */
export const productDetailSchema = productSchema.extend({
  images: z.array(z.string()).default([]),
  sku: z.string().optional(),
  weight: z.number().optional(),
  dimensions: z.object({ width: z.number(), height: z.number(), depth: z.number() }).optional(),
  warrantyInformation: z.string().optional(),
  shippingInformation: z.string().optional(),
  returnPolicy: z.string().optional(),
  reviews: z.array(reviewSchema).default([]),
})
export type ProductDetail = z.infer<typeof productDetailSchema>

export const productListResponseSchema = z.object({ products: z.array(productSchema) })

export const categorySchema = z.object({ slug: z.string(), name: z.string(), url: z.string() })
export type Category = z.infer<typeof categorySchema>

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
