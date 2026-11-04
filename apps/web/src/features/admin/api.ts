import type { ProductBody, ProductPatchBody } from '@ays/validators'

import { api, call, callNoContent } from '@/lib/api'

export async function getAdminProducts() {
  const { data } = await call(api.admin.products.$get())
  return data
}

export async function createProduct(body: ProductBody) {
  const { data } = await call(api.products.$post({ json: body }), 201)
  return data
}

export async function updateProduct(id: number, body: ProductPatchBody) {
  const { data } = await call(api.products[':id'].$patch({ param: { id: String(id) }, json: body }))
  return data
}

export async function deleteProduct(id: number) {
  await callNoContent(api.products[':id'].$delete({ param: { id: String(id) } }))
}

export async function restoreProduct(id: number) {
  const { data } = await call(api.products[':id'].restore.$post({ param: { id: String(id) } }))
  return data
}
