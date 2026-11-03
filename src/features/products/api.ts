import { http } from '@/lib/http'

import {
  categorySchema,
  productDetailSchema,
  productListResponseSchema,
  type Product,
} from './schemas'
import { z } from 'zod'

const LIST_FIELDS = [
  'id',
  'title',
  'description',
  'category',
  'price',
  'discountPercentage',
  'rating',
  'stock',
  'brand',
  'thumbnail',
  'availabilityStatus',
  'minimumOrderQuantity',
  'tags',
].join(',')

/** The whole catalog in one request (ADR-0004): search, filter, sort and paging run client-side. */
export async function getCatalog(): Promise<Product[]> {
  const { data } = await http.get<unknown>('/products', {
    params: { limit: 0, select: LIST_FIELDS },
  })
  return productListResponseSchema.parse(data).products
}

export async function getProduct(id: number) {
  const { data } = await http.get<unknown>(`/products/${id}`)
  return productDetailSchema.parse(data)
}

export async function getCategories() {
  const { data } = await http.get<unknown>('/products/categories')
  return z.array(categorySchema).parse(data)
}

// DummyJSON accepts these writes but persists nothing (docs/api.md). The responses only prove the
// request was well formed; the app stores the result itself in the admin overlay.
const writeEchoSchema = z.object({ id: z.number() }).passthrough()
const deleteEchoSchema = z.object({ id: z.number(), isDeleted: z.boolean() }).passthrough()

export interface ProductWriteBody {
  title?: string
  description?: string
  category?: string
  brand?: string
  price?: number
  discountPercentage?: number
  stock?: number
  thumbnail?: string
}

export async function createProduct(body: ProductWriteBody) {
  const { data } = await http.post<unknown>('/products/add', body)
  return writeEchoSchema.parse(data)
}

export async function updateProduct(id: number, body: ProductWriteBody) {
  const { data } = await http.put<unknown>(`/products/${id}`, body)
  return writeEchoSchema.parse(data)
}

export async function deleteProduct(id: number) {
  const { data } = await http.delete<unknown>(`/products/${id}`)
  return deleteEchoSchema.parse(data)
}
