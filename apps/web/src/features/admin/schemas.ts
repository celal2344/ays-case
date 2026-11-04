import { z } from 'zod'

import type { Product } from '@/features/products/schemas'

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
    category: product.category,
    brand: product.brand ?? '',
    price: String(product.price),
    discountPercentage: String(product.discountPercentage),
    stock: String(product.stock),
    thumbnail: product.thumbnail,
  }
}

/** Same default as the database column; the API derives `availability` from it. */
const DEFAULT_LOW_STOCK_THRESHOLD = 5

/** Everything a new product needs; fields the form does not edit get neutral defaults. */
export function toNewProduct(values: ProductFormValues): Omit<Product, 'id'> {
  const stock = Number(values.stock)
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    category: values.category,
    ...(values.brand.trim() ? { brand: values.brand.trim() } : {}),
    price: Number(values.price),
    discountPercentage: Number(values.discountPercentage),
    rating: null,
    reviewCount: 0,
    stock,
    thumbnail: values.thumbnail.trim(),
    lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD,
    availability: stock <= 0 ? 'out' : stock <= DEFAULT_LOW_STOCK_THRESHOLD ? 'low' : 'in',
    minimumOrderQuantity: 1,
    tags: [values.category],
  }
}

/** Only the fields the form edits. An emptied brand is stored as '' so the patch survives JSON. */
export function toProductPatch(values: ProductFormValues) {
  const stock = Number(values.stock)
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    category: values.category,
    brand: values.brand.trim(),
    price: Number(values.price),
    discountPercentage: Number(values.discountPercentage),
    stock,
    thumbnail: values.thumbnail.trim(),
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
