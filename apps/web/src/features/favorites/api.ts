import { api, call, callNoContent } from '@/lib/api'

/** Product ids, newest first. */
export async function getFavorites() {
  const { data } = await call(api.favorites.$get())
  return data
}

export async function addFavorite(productId: number) {
  await callNoContent(api.favorites[':productId'].$put({ param: { productId: String(productId) } }))
}

export async function removeFavorite(productId: number) {
  await callNoContent(
    api.favorites[':productId'].$delete({ param: { productId: String(productId) } }),
  )
}
