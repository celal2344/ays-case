import { api, call } from '@/lib/api'

/** The whole catalog in one request (ADR-0004): search, filter, sort and paging run client-side. */
export async function getCatalog() {
  const { data } = await call(api.products.$get())
  return data
}

export async function getProduct(id: number) {
  const { data } = await call(api.products[':id'].$get({ param: { id: String(id) } }))
  return data
}

export async function getCategories() {
  const { data } = await call(api.categories.$get())
  return data
}
