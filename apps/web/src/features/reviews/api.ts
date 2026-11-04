import type { ReviewBody, ReviewUpdateBody } from '@ays/validators'

import { api, call, callNoContent } from '@/lib/api'

export async function createReview(productId: number, body: ReviewBody) {
  const { data } = await call(
    api.products[':id'].reviews.$post({ param: { id: String(productId) }, json: body }),
    201,
  )
  return data
}

export async function updateReview(reviewId: number, body: ReviewUpdateBody) {
  const { data } = await call(
    api.reviews[':id'].$patch({ param: { id: String(reviewId) }, json: body }),
  )
  return data
}

export async function deleteReview(reviewId: number) {
  await callNoContent(api.reviews[':id'].$delete({ param: { id: String(reviewId) } }))
}
