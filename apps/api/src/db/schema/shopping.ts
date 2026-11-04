import { sql } from 'drizzle-orm'
import { check, index, integer, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core'

import { user } from './auth'
import { products } from './products'

const userId = () =>
  text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' })

const productId = () =>
  integer('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' })

/** One line per user and product: ids and a quantity only, prices come from `products`. */
export const cartItems = pgTable(
  'cart_items',
  {
    userId: userId(),
    productId: productId(),
    quantity: integer('quantity').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.productId] }),
    check('cart_items_quantity_check', sql`${t.quantity} >= 1`),
  ],
).enableRLS()

export const favorites = pgTable(
  'favorites',
  {
    userId: userId(),
    productId: productId(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.productId] })],
).enableRLS()

export const recentlyViewed = pgTable(
  'recently_viewed',
  {
    userId: userId(),
    productId: productId(),
    viewedAt: timestamp('viewed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.productId] }),
    index('recently_viewed_user_viewed_idx').on(t.userId, t.viewedAt.desc()),
  ],
).enableRLS()
