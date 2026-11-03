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
