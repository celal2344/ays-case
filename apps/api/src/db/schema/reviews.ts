import { eq, sql } from 'drizzle-orm'
import {
  check,
  index,
  integer,
  pgTable,
  pgView,
  smallint,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core'

import { user } from './auth'
import { products } from './products'

export const reviews = pgTable(
  'reviews',
  {
    id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    rating: smallint('rating').notNull(),
    comment: text('comment').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('reviews_rating_check', sql`${t.rating} between 1 and 5`),
    check('reviews_comment_check', sql`char_length(${t.comment}) between 10 and 500`),
    unique('reviews_product_user_unique').on(t.productId, t.userId),
    index('reviews_product_idx').on(t.productId),
  ],
).enableRLS()

const countOf = (rating: number) =>
  sql<number>`(count(${reviews.id}) filter (where ${reviews.rating} = ${sql.raw(String(rating))}))::int`

/** The only source of ratings: every product has a row, with a null average when it has no reviews. */
export const productRatingStats = pgView('product_rating_stats')
  .with({ securityInvoker: true })
  .as((qb) =>
    qb
      .select({
        productId: sql<number>`${products.id}`.as('product_id'),
        ratingAvg: sql<string | null>`round(avg(${reviews.rating})::numeric, 1)`.as('rating_avg'),
        ratingCount: sql<number>`count(${reviews.id})::int`.as('rating_count'),
        rating1: countOf(1).as('rating_1'),
        rating2: countOf(2).as('rating_2'),
        rating3: countOf(3).as('rating_3'),
        rating4: countOf(4).as('rating_4'),
        rating5: countOf(5).as('rating_5'),
      })
      .from(products)
      .leftJoin(reviews, eq(reviews.productId, products.id))
      .groupBy(products.id),
  )
