import { getDb } from '../../db/client'
import * as repository from './repository'

export const listFavorites = (userId: string) => repository.listFavorites(getDb(), userId)

/** Idempotent; returns false when the product is unknown or deleted. */
export async function addFavorite(userId: string, productId: number): Promise<boolean> {
  const db = getDb()
  if (!(await repository.productExists(db, productId))) return false
  await repository.addFavorite(db, userId, productId)
  return true
}

export const removeFavorite = (userId: string, productId: number) =>
  repository.removeFavorite(getDb(), userId, productId)
