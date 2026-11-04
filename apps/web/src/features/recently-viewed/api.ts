import { api, call, callNoContent } from '@/lib/api'

/** Product ids, newest first. */
export async function getRecentlyViewed() {
  const { data } = await call(api['recently-viewed'].$get())
  return data
}

export async function recordView(productId: number) {
  await callNoContent(
    api['recently-viewed'][':productId'].$put({ param: { productId: String(productId) } }),
  )
}

export async function clearRecentlyViewed() {
  await callNoContent(api['recently-viewed'].$delete())
}
