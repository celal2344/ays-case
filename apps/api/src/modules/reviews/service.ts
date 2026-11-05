import { getDb } from '../../db/client'
import * as repository from './repository'

type Review = NonNullable<Awaited<ReturnType<typeof repository.findReview>>>

export type CreateResult =
  { ok: true; review: Review } | { ok: false; reason: 'product_not_found' | 'review_exists' }

export type ChangeResult<T> =
  { ok: true; value: T } | { ok: false; reason: 'not_found' | 'forbidden' }

/** One review per user and product. */
export async function createReview(
  userId: string,
  productId: number,
  input: { rating: number; comment: string },
): Promise<CreateResult> {
  const db = getDb()
  if (!(await repository.productExists(db, productId))) {
    return { ok: false, reason: 'product_not_found' }
  }
  if (await repository.hasReview(db, productId, userId)) {
    return { ok: false, reason: 'review_exists' }
  }
  const id = await repository.insertReview(db, { productId, userId, ...input })
  return { ok: true, review: (await repository.findReview(db, id))! }
}

/** Editing is for the author only. */
export async function updateReview(
  userId: string,
  id: number,
  patch: Parameters<typeof repository.updateReview>[2],
): Promise<ChangeResult<Review>> {
  const db = getDb()
  const owner = await repository.findOwner(db, id)
  if (owner === undefined) return { ok: false, reason: 'not_found' }
  if (owner !== userId) return { ok: false, reason: 'forbidden' }
  await repository.updateReview(db, id, patch)
  return { ok: true, value: (await repository.findReview(db, id))! }
}

/** Deleting is for the author or an admin. */
export async function deleteReview(
  userId: string,
  role: string | null | undefined,
  id: number,
): Promise<ChangeResult<null>> {
  const db = getDb()
  const owner = await repository.findOwner(db, id)
  if (owner === undefined) return { ok: false, reason: 'not_found' }
  if (owner !== userId && role !== 'admin') return { ok: false, reason: 'forbidden' }
  await repository.deleteReview(db, id)
  return { ok: true, value: null }
}
