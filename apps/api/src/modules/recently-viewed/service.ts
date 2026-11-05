import { getDb } from '../../db/client'
import * as repository from './repository'

export const listRecentlyViewed = (userId: string) => repository.listRecentlyViewed(getDb(), userId)

/** Returns false when the product is unknown or deleted. */
export async function recordView(userId: string, productId: number): Promise<boolean> {
  const db = getDb()
  if (!(await repository.productExists(db, productId))) return false
  await repository.recordView(db, userId, productId)
  return true
}

export const clearRecentlyViewed = (userId: string) =>
  repository.clearRecentlyViewed(getDb(), userId)
