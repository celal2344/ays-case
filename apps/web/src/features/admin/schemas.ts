import { toCents } from '@ays/validators'
import { z } from 'zod'

import type { Category, Product } from '@/features/products/schemas'

// Form fields are strings (that is what inputs hold). Messages are i18n keys, translated where shown.
export const FORM_ERRORS = {
  title: 'admin.form.errors.title',
  description: 'admin.form.errors.description',
  category: 'admin.form.errors.category',
  brand: 'admin.form.errors.brand',
  price: 'admin.form.errors.price',
  discount: 'admin.form.errors.discount',
  stock: 'admin.form.errors.stock',
  thumbnail: 'admin.form.errors.thumbnail',
} as const

function isHttpUrl(value: string) {
  try {
    const { protocol } = new URL(value)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

export const productFormSchema = z.object({
  title: z.string().trim().min(2, FORM_ERRORS.title).max(100, FORM_ERRORS.title),
  description: z
    .string()
    .trim()
    .min(10, FORM_ERRORS.description)
    .max(1000, FORM_ERRORS.description),
  category: z.string().min(1, FORM_ERRORS.category),
  brand: z.string().trim().max(50, FORM_ERRORS.brand),
  price: z
    .string()
    .trim()
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v) && Number(v) > 0, FORM_ERRORS.price),
  discountPercentage: z
    .string()
    .trim()
    .refine(
      (v) => /^\d+(\.\d+)?$/.test(v) && Number(v) >= 0 && Number(v) <= 90,
      FORM_ERRORS.discount,
    ),
  stock: z
    .string()
    .trim()
    .refine((v) => /^\d+$/.test(v), FORM_ERRORS.stock),
  thumbnail: z
    .string()
    .trim()
    .refine((v) => v === '' || isHttpUrl(v), FORM_ERRORS.thumbnail),
})
export type ProductFormValues = z.infer<typeof productFormSchema>

export const emptyProductForm: ProductFormValues = {
  title: '',
  description: '',
  category: '',
  brand: '',
  price: '',
  discountPercentage: '0',
  stock: '0',
  thumbnail: '',
}

export function toFormValues(product: Product): ProductFormValues {
  return {
    title: product.title,
    description: product.description,
    category: product.category.slug,
    brand: product.brand?.name ?? '',
    price: String(product.priceCents / 100),
    discountPercentage: String(product.discountPercentage),
    stock: String(product.stock),
    thumbnail: product.thumbnail ?? '',
  }
}

/** Same default as the database column; the API derives `availability` from it. */
const DEFAULT_LOW_STOCK_THRESHOLD = 5

const slugify = (value: string) => value.trim().toLowerCase().replaceAll(/s+/g, '-')

/** The form holds a slug; the product carries the whole category, like the API's. */
function categoryOf(slug: string, categories: readonly Category[]) {
  return categories.find((c) => c.slug === slug) ?? { id: 0, slug, name: slug }
}

/** A typed brand name becomes a brand object (id 0: it only exists in this browser). */
function brandOf(name: string) {
  const trimmed = name.trim()
  return trimmed ? { id: 0, slug: slugify(trimmed), name: trimmed } : null
}

/**
 * Everything a new product needs; fields the form does not edit get neutral defaults. The form
 * collects dollars; this is the one place they become cents.
 */
export function toNewProduct(
  values: ProductFormValues,
  categories: readonly Category[],
): Omit<Product, 'id'> {
  const stock = Number(values.stock)
  const category = categoryOf(values.category, categories)
  const now = new Date().toISOString()
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    category,
    brand: brandOf(values.brand),
    priceCents: toCents(Number(values.price)),
    discountPercentage: Number(values.discountPercentage),
    rating: null,
    reviewCount: 0,
    stock,
    thumbnail: values.thumbnail.trim() || null,
    lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD,
    availability: stock <= 0 ? 'out' : stock <= DEFAULT_LOW_STOCK_THRESHOLD ? 'low' : 'in',
    minimumOrderQuantity: 1,
    tags: [{ slug: category.slug, name: category.name }],
    createdAt: now,
    updatedAt: now,
  }
}

/** Only the fields the form edits. An emptied brand is stored as null, which survives JSON. */
export function toProductPatch(values: ProductFormValues, categories: readonly Category[]) {
  const stock = Number(values.stock)
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    category: categoryOf(values.category, categories),
    brand: brandOf(values.brand),
    priceCents: toCents(Number(values.price)),
    discountPercentage: Number(values.discountPercentage),
    stock,
    thumbnail: values.thumbnail.trim() || null,
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
})
export type AdminProductSearch = z.infer<typeof adminProductSearchSchema>
