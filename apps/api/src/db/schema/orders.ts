import { sql } from 'drizzle-orm'
import { check, index, integer, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import { user } from './auth'
import { products } from './products'

/** A purchase. Ids are UUIDs (user-owned data); everything is in integer cents. */
export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    subtotalCents: integer('subtotal_cents').notNull(),
    discountCents: integer('discount_cents').notNull(),
    totalCents: integer('total_cents').notNull(),
    shippingFullName: text('shipping_full_name').notNull(),
    shippingAddress: text('shipping_address').notNull(),
    shippingCity: text('shipping_city').notNull(),
    shippingPhone: text('shipping_phone').notNull(),
  },
  (t) => [
    check(
      'orders_cents_check',
      sql`${t.subtotalCents} >= 0 and ${t.discountCents} >= 0 and ${t.totalCents} >= 0`,
    ),
    check('orders_totals_check', sql`${t.totalCents} = ${t.subtotalCents} - ${t.discountCents}`),
    index('orders_user_created_idx').on(t.userId, t.createdAt.desc()),
  ],
).enableRLS()

/**
 * A line frozen at purchase time: later edits to the product never rewrite history. `product_id`
 * is kept, and becomes null if the product is ever hard-deleted.
 */
export const orderLines = pgTable(
  'order_lines',
  {
    id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    productId: integer('product_id').references(() => products.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    thumbnail: text('thumbnail'),
    listCents: integer('list_cents').notNull(),
    unitCents: integer('unit_cents').notNull(),
    discountPercentage: numeric('discount_percentage', { precision: 5, scale: 2 }).notNull(),
    quantity: integer('quantity').notNull(),
  },
  (t) => [
    check('order_lines_cents_check', sql`${t.listCents} >= 0 and ${t.unitCents} >= 0`),
    check('order_lines_quantity_check', sql`${t.quantity} >= 1`),
    index('order_lines_order_idx').on(t.orderId),
    index('order_lines_product_idx').on(t.productId),
  ],
).enableRLS()
