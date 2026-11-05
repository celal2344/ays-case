import { z } from 'zod'

import { envelope } from './http.js'

export const roleSchema = z.enum(['admin', 'user'])
export type Role = z.infer<typeof roleSchema>

export const availabilitySchema = z.enum(['in', 'low', 'out'])
export type Availability = z.infer<typeof availabilitySchema>

export const categorySchema = z.object({ id: z.number().int(), slug: z.string(), name: z.string() })
export const brandSchema = categorySchema
export const policySchema = z.object({ id: z.number().int(), label: z.string() })
export const tagSchema = z.object({ slug: z.string(), name: z.string() })
export const imageSchema = z.object({
  url: z.string(),
  position: z.number().int(),
  isPrimary: z.boolean(),
})

/** One entry per star, computed in SQL from `product_rating_stats`. */
export const ratingHistogramSchema = z.object({
  '1': z.number().int(),
  '2': z.number().int(),
  '3': z.number().int(),
  '4': z.number().int(),
  '5': z.number().int(),
})

/** Fields of a product in the catalog list. Money is integer cents. */
export const productSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  description: z.string(),
  category: categorySchema,
  brand: brandSchema.nullable(),
  priceCents: z.number().int(),
  discountPercentage: z.number(),
  stock: z.number().int(),
  minimumOrderQuantity: z.number().int(),
  lowStockThreshold: z.number().int(),
  availability: availabilitySchema,
  tags: z.array(tagSchema),
  /** The primary image; null when a product has no image. */
  thumbnail: z.string().nullable(),
  /** Average review rating rounded to one decimal; null when unreviewed. */
  rating: z.number().nullable(),
  reviewCount: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const reviewSchema = z.object({
  id: z.number().int(),
  rating: z.number().int(),
  comment: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  author: z.object({ id: z.string(), name: z.string() }),
  /** True when the author has an order containing this product (computed in SQL). */
  verifiedBuyer: z.boolean(),
})

export const productDetailSchema = productSchema.extend({
  sku: z.string(),
  barcode: z.string().nullable(),
  images: z.array(imageSchema),
  weightG: z.number().int().nullable(),
  widthMm: z.number().int().nullable(),
  heightMm: z.number().int().nullable(),
  depthMm: z.number().int().nullable(),
  warranty: policySchema.nullable(),
  shipping: policySchema.nullable(),
  returnPolicy: policySchema.nullable(),
  ratingHistogram: ratingHistogramSchema,
  reviews: z.array(reviewSchema),
})

export const userSchema = z.object({
  id: z.string(),
  username: z.string().nullable(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  role: roleSchema,
  image: z.string().nullable(),
})

export const productListResponseSchema = envelope(z.array(productSchema))
export const productDetailResponseSchema = envelope(productDetailSchema)
export const categoryListResponseSchema = envelope(z.array(categorySchema))
export const userListResponseSchema = envelope(z.array(userSchema))

export type Category = z.infer<typeof categorySchema>
export type Product = z.infer<typeof productSchema>
export type ProductDetail = z.infer<typeof productDetailSchema>
export type Review = z.infer<typeof reviewSchema>
export type User = z.infer<typeof userSchema>
