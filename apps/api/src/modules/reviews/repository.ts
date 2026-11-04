import { and, eq, sql } from 'drizzle-orm'

import type { Database } from '../../db/client'
import { orderLines, orders, products, reviews, user } from '../../db/schema'

/** Verified buyer: the review's author has an order with a line for the reviewed product. */
export const verifiedBuyer = sql<boolean>`exists (
  select 1 from ${orderLines}
  inner join ${orders} on ${orders.id} = ${orderLines.orderId}
  where ${orders.userId} = ${reviews.userId} and ${orderLines.productId} = ${reviews.productId}
)`

export const reviewColumns = {
  id: reviews.id,
  rating: reviews.rating,
  comment: reviews.comment,
  createdAt: reviews.createdAt,
  updatedAt: reviews.updatedAt,
  authorId: user.id,
  authorName: user.name,
  verifiedBuyer,
}

export type ReviewRow = {
  id: number
  rating: number
  comment: string
  createdAt: Date
  updatedAt: Date
  authorId: string
  authorName: string
  verifiedBuyer: boolean
}

export const toReview = (row: ReviewRow) => ({
  id: row.id,
  rating: row.rating,
  comment: row.comment,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
  author: { id: row.authorId, name: row.authorName },
  verifiedBuyer: row.verifiedBuyer,
})

export async function productExists(db: Database, productId: number) {
  const [row] = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.id, productId), sql`${products.deletedAt} is null`))
  return row !== undefined
}

export async function findOwner(db: Database, id: number) {
  const [row] = await db.select({ userId: reviews.userId }).from(reviews).where(eq(reviews.id, id))
  return row?.userId
}

export async function hasReview(db: Database, productId: number, userId: string) {
  const [row] = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(and(eq(reviews.productId, productId), eq(reviews.userId, userId)))
  return row !== undefined
}

export async function findReview(db: Database, id: number) {
  const [row] = await db
    .select(reviewColumns)
    .from(reviews)
    .innerJoin(user, eq(user.id, reviews.userId))
    .where(eq(reviews.id, id))
  return row ? toReview(row) : undefined
}

export async function insertReview(
  db: Database,
  input: { productId: number; userId: string; rating: number; comment: string },
) {
  const [row] = await db.insert(reviews).values(input).returning({ id: reviews.id })
  return row!.id
}

export async function updateReview(
  db: Database,
  id: number,
  patch: { rating?: number | undefined; comment?: string | undefined },
) {
  await db
    .update(reviews)
    .set({
      ...(patch.rating === undefined ? {} : { rating: patch.rating }),
      ...(patch.comment === undefined ? {} : { comment: patch.comment }),
      updatedAt: sql`now()`,
    })
    .where(eq(reviews.id, id))
}

export async function deleteReview(db: Database, id: number) {
  await db.delete(reviews).where(eq(reviews.id, id))
}
