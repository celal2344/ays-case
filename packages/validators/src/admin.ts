import { z } from 'zod'

import { productSchema, roleSchema, userSchema } from './catalog.js'
import { envelope } from './http.js'

/** The numbers the forms show and the API enforces (the database CHECKs are the same or wider). */
export const LIMITS = {
  title: { min: 2, max: 100 },
  description: { min: 10, max: 1000 },
  sku: { min: 1, max: 64 },
  barcode: { min: 1, max: 64 },
  name: { min: 1, max: 80 },
  slug: { min: 1, max: 80 },
  label: { min: 1, max: 120 },
  username: { min: 3, max: 30 },
  personName: { min: 1, max: 50 },
  password: { min: 8, max: 72 },
  maxImages: 12,
  maxTags: 20,
} as const

const id = z.number().int().positive()
const nullableId = id.nullable()
const dimension = z.number().int().positive().nullable()

const slug = z
  .string()
  .trim()
  .min(LIMITS.slug.min)
  .max(LIMITS.slug.max)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug')

const httpUrl = z
  .url()
  .refine((value) => value.startsWith('http://') || value.startsWith('https://'), 'url')

/** Images are URLs. The array order is the position; at most one is flagged primary (default: the first). */
export const productImageInputSchema = z.object({
  url: httpUrl,
  isPrimary: z.boolean().optional(),
})

export const productBodySchema = z.object({
  title: z.string().trim().min(LIMITS.title.min).max(LIMITS.title.max),
  description: z.string().trim().min(LIMITS.description.min).max(LIMITS.description.max),
  sku: z.string().trim().min(LIMITS.sku.min).max(LIMITS.sku.max),
  barcode: z.string().trim().min(LIMITS.barcode.min).max(LIMITS.barcode.max).nullable(),
  categoryId: id,
  brandId: nullableId,
  priceCents: z.number().int().min(0),
  discountPercentage: z.number().min(0).max(100),
  stock: z.number().int().min(0),
  minimumOrderQuantity: z.number().int().min(1),
  lowStockThreshold: z.number().int().min(0),
  weightG: dimension,
  widthMm: dimension,
  heightMm: dimension,
  depthMm: dimension,
  warrantyPolicyId: nullableId,
  shippingPolicyId: nullableId,
  returnPolicyId: nullableId,
  /** Replaces the whole tag set. */
  tagIds: z.array(id).max(LIMITS.maxTags),
  /** Replaces the whole image list. */
  images: z
    .array(productImageInputSchema)
    .max(LIMITS.maxImages)
    .refine((images) => images.filter((image) => image.isPrimary).length <= 1, 'one primary image'),
})

/** Every field optional; the tag set and the image list, when present, replace the old ones. */
export const productPatchBodySchema = productBodySchema.partial()

export const adminProductSchema = productSchema.extend({ deletedAt: z.string().nullable() })

export const adminProductListResponseSchema = envelope(z.array(adminProductSchema))

const name = z.string().trim().min(LIMITS.name.min).max(LIMITS.name.max)
const optionalSlug = slug.optional()

/** The slug is made from the name when it is not given. */
export const categoryBodySchema = z.object({
  name,
  slug: optionalSlug,
  sortOrder: z.number().int().min(0).optional(),
})
export const brandBodySchema = z.object({ name, slug: optionalSlug })
export const tagBodySchema = z.object({ name, slug: optionalSlug })
export const policyBodySchema = z.object({
  label: z.string().trim().min(LIMITS.label.min).max(LIMITS.label.max),
})

export const categoryPatchBodySchema = categoryBodySchema.partial()
export const brandPatchBodySchema = brandBodySchema.partial()
export const tagPatchBodySchema = tagBodySchema.partial()
export const policyPatchBodySchema = policyBodySchema.partial()

export const adminCategorySchema = z.object({
  id,
  slug: z.string(),
  name: z.string(),
  sortOrder: z.number().int(),
})
export const adminSluggedSchema = z.object({ id, slug: z.string(), name: z.string() })
export const adminPolicySchema = z.object({ id, label: z.string() })

export const adminCategoryResponseSchema = envelope(adminCategorySchema)
export const adminCategoryListResponseSchema = envelope(z.array(adminCategorySchema))
export const adminSluggedResponseSchema = envelope(adminSluggedSchema)
export const adminSluggedListResponseSchema = envelope(z.array(adminSluggedSchema))
export const adminPolicyResponseSchema = envelope(adminPolicySchema)
export const adminPolicyListResponseSchema = envelope(z.array(adminPolicySchema))

/** Users are created with an initial password, which Better Auth hashes. */
export const userBodySchema = z.object({
  username: z
    .string()
    .trim()
    .min(LIMITS.username.min)
    .max(LIMITS.username.max)
    .regex(/^[a-zA-Z0-9_.]+$/, 'username'),
  firstName: z.string().trim().min(LIMITS.personName.min).max(LIMITS.personName.max),
  lastName: z.string().trim().min(LIMITS.personName.min).max(LIMITS.personName.max),
  email: z.email(),
  role: roleSchema,
})
export const userCreateBodySchema = userBodySchema.extend({
  password: z.string().min(LIMITS.password.min).max(LIMITS.password.max),
})
export const userPatchBodySchema = userBodySchema.partial()

export const userResponseSchema = envelope(userSchema)

export type ProductBody = z.infer<typeof productBodySchema>
export type ProductPatchBody = z.infer<typeof productPatchBodySchema>
export type CategoryBody = z.infer<typeof categoryBodySchema>
export type UserCreateBody = z.infer<typeof userCreateBodySchema>
export type UserPatchBody = z.infer<typeof userPatchBodySchema>
export type AdminProduct = z.infer<typeof adminProductSchema>
