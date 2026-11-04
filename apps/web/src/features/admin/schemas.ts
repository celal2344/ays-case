import { LIMITS, toCents, type ProductBody } from '@ays/validators'
import { z } from 'zod'

import type { ProductDetail } from '@/features/products/schemas'

// Form fields are strings (that is what inputs hold). Messages are i18n keys, translated where shown.
export const FORM_ERRORS = {
  title: 'admin.form.errors.title',
  description: 'admin.form.errors.description',
  sku: 'admin.form.errors.sku',
  barcode: 'admin.form.errors.barcode',
  category: 'admin.form.errors.category',
  price: 'admin.form.errors.price',
  discount: 'admin.form.errors.discount',
  stock: 'admin.form.errors.stock',
  moq: 'admin.form.errors.moq',
  threshold: 'admin.form.errors.threshold',
  measure: 'admin.form.errors.measure',
  imageUrl: 'admin.form.errors.imageUrl',
} as const

function isHttpUrl(value: string) {
  try {
    const { protocol } = new URL(value)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

/** Empty, or a positive number with at most `places` decimals. */
const optionalMeasure = (places: number) =>
  z
    .string()
    .trim()
    .refine(
      (v) => v === '' || (new RegExp(`^\\d+(\\.\\d{1,${places}})?$`).test(v) && Number(v) > 0),
      FORM_ERRORS.measure,
    )

export const productFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(LIMITS.title.min, FORM_ERRORS.title)
    .max(LIMITS.title.max, FORM_ERRORS.title),
  description: z
    .string()
    .trim()
    .min(LIMITS.description.min, FORM_ERRORS.description)
    .max(LIMITS.description.max, FORM_ERRORS.description),
  sku: z.string().trim().min(LIMITS.sku.min, FORM_ERRORS.sku).max(LIMITS.sku.max, FORM_ERRORS.sku),
  barcode: z.string().trim().max(LIMITS.barcode.max, FORM_ERRORS.barcode),
  categoryId: z.string().min(1, FORM_ERRORS.category),
  brandId: z.string(),
  warrantyPolicyId: z.string(),
  shippingPolicyId: z.string(),
  returnPolicyId: z.string(),
  price: z
    .string()
    .trim()
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v) && Number(v) > 0, FORM_ERRORS.price),
  discountPercentage: z
    .string()
    .trim()
    .refine(
      (v) => /^\d+(\.\d+)?$/.test(v) && Number(v) >= 0 && Number(v) <= 100,
      FORM_ERRORS.discount,
    ),
  stock: z
    .string()
    .trim()
    .refine((v) => /^\d+$/.test(v), FORM_ERRORS.stock),
  minimumOrderQuantity: z
    .string()
    .trim()
    .refine((v) => /^\d+$/.test(v) && Number(v) >= 1, FORM_ERRORS.moq),
  lowStockThreshold: z
    .string()
    .trim()
    .refine((v) => /^\d+$/.test(v), FORM_ERRORS.threshold),
  weightKg: optionalMeasure(3),
  widthCm: optionalMeasure(1),
  heightCm: optionalMeasure(1),
  depthCm: optionalMeasure(1),
  tagIds: z.array(z.string()),
  /** The image list: the array order is the position. */
  images: z.array(
    z.object({
      url: z
        .string()
        .trim()
        .refine((v) => isHttpUrl(v), FORM_ERRORS.imageUrl),
    }),
  ),
  /** Index of the primary image in `images`. */
  primaryImage: z.number().int().min(0),
})
export type ProductFormValues = z.infer<typeof productFormSchema>

export const emptyProductForm: ProductFormValues = {
  title: '',
  description: '',
  sku: '',
  barcode: '',
  categoryId: '',
  brandId: '',
  warrantyPolicyId: '',
  shippingPolicyId: '',
  returnPolicyId: '',
  price: '',
  discountPercentage: '0',
  stock: '0',
  minimumOrderQuantity: '1',
  lowStockThreshold: '5',
  weightKg: '',
  widthCm: '',
  heightCm: '',
  depthCm: '',
  tagIds: [],
  images: [],
  primaryImage: 0,
}

const text = (id: number | null | undefined) => (id === null || id === undefined ? '' : String(id))
const fromMeasure = (value: number | null, divisor: number) =>
  value === null ? '' : String(value / divisor)

/** `tagIdBySlug` maps the detail's tag slugs back to ids (the detail carries slug and name only). */
export function toFormValues(
  product: ProductDetail,
  tagIdBySlug: ReadonlyMap<string, number>,
): ProductFormValues {
  const images = product.images.toSorted((a, b) => a.position - b.position)
  return {
    title: product.title,
    description: product.description,
    sku: product.sku,
    barcode: product.barcode ?? '',
    categoryId: text(product.category.id),
    brandId: text(product.brand?.id),
    warrantyPolicyId: text(product.warranty?.id),
    shippingPolicyId: text(product.shipping?.id),
    returnPolicyId: text(product.returnPolicy?.id),
    // the one place cents become dollars for a form field
    price: String(product.priceCents / 100),
    discountPercentage: String(product.discountPercentage),
    stock: String(product.stock),
    minimumOrderQuantity: String(product.minimumOrderQuantity),
    lowStockThreshold: String(product.lowStockThreshold),
    weightKg: fromMeasure(product.weightG, 1000),
    widthCm: fromMeasure(product.widthMm, 10),
    heightCm: fromMeasure(product.heightMm, 10),
    depthCm: fromMeasure(product.depthMm, 10),
    tagIds: product.tags.flatMap((tag) => {
      const id = tagIdBySlug.get(tag.slug)
      return id === undefined ? [] : [String(id)]
    }),
    images: images.map((image) => ({ url: image.url })),
    primaryImage: Math.max(
      0,
      images.findIndex((image) => image.isPrimary),
    ),
  }
}

const toId = (value: string) => (value === '' ? null : Number(value))
const toMeasure = (value: string, factor: number) =>
  value.trim() === '' ? null : Math.round(Number(value) * factor)

/**
 * The request body. The form collects dollars, kilograms and centimetres; this is the one place they
 * become cents, grams and millimetres.
 */
export function toProductBody(values: ProductFormValues): ProductBody {
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    sku: values.sku.trim(),
    barcode: values.barcode.trim() === '' ? null : values.barcode.trim(),
    categoryId: Number(values.categoryId),
    brandId: toId(values.brandId),
    priceCents: toCents(Number(values.price)),
    discountPercentage: Number(values.discountPercentage),
    stock: Number(values.stock),
    minimumOrderQuantity: Number(values.minimumOrderQuantity),
    lowStockThreshold: Number(values.lowStockThreshold),
    weightG: toMeasure(values.weightKg, 1000),
    widthMm: toMeasure(values.widthCm, 10),
    heightMm: toMeasure(values.heightCm, 10),
    depthMm: toMeasure(values.depthCm, 10),
    warrantyPolicyId: toId(values.warrantyPolicyId),
    shippingPolicyId: toId(values.shippingPolicyId),
    returnPolicyId: toId(values.returnPolicyId),
    tagIds: values.tagIds.map(Number),
    images: values.images.map((image, index) => ({
      url: image.url.trim(),
      isPrimary: index === values.primaryImage,
    })),
  }
}

export const ADMIN_SORTS = ['title', 'category', 'price', 'stock', 'rating'] as const
export type AdminSort = (typeof ADMIN_SORTS)[number]
export const ADMIN_PAGE_SIZE = 20

/** URL state of the admin product table; `undefined` is the default (catalog order, page 1). */
export const adminProductSearchSchema = z.object({
  q: z.string().optional().catch(undefined),
  category: z.string().optional().catch(undefined),
  sort: z.enum(ADMIN_SORTS).optional().catch(undefined),
  order: z.enum(['asc', 'desc']).optional().catch(undefined),
  page: z.coerce.number().int().min(2).optional().catch(undefined),
  /** Show soft-deleted products too (and nothing else when `only`). */
  deleted: z.enum(['include', 'only']).optional().catch(undefined),
})
export type AdminProductSearch = z.infer<typeof adminProductSearchSchema>
