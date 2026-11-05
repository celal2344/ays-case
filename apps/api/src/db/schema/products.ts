import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

import {
  brands,
  categories,
  returnPolicies,
  shippingPolicies,
  tags,
  warrantyPolicies,
} from './lookups'

export const products = pgTable(
  'products',
  {
    // The first 194 rows keep the ids of the original catalog import; new rows continue above the max.
    id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    sku: text('sku').notNull().unique(),
    barcode: text('barcode').unique(),
    categoryId: integer('category_id')
      .notNull()
      .references(() => categories.id),
    brandId: integer('brand_id').references(() => brands.id),
    priceCents: integer('price_cents').notNull(),
    discountPercentage: numeric('discount_percentage', { precision: 5, scale: 2 })
      .notNull()
      .default('0'),
    stock: integer('stock').notNull().default(0),
    minimumOrderQuantity: integer('minimum_order_quantity').notNull().default(1),
    lowStockThreshold: integer('low_stock_threshold').notNull().default(5),
    weightG: integer('weight_g'),
    widthMm: integer('width_mm'),
    heightMm: integer('height_mm'),
    depthMm: integer('depth_mm'),
    warrantyPolicyId: integer('warranty_policy_id').references(() => warrantyPolicies.id),
    shippingPolicyId: integer('shipping_policy_id').references(() => shippingPolicies.id),
    returnPolicyId: integer('return_policy_id').references(() => returnPolicies.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    check('products_price_cents_check', sql`${t.priceCents} >= 0`),
    check('products_discount_check', sql`${t.discountPercentage} between 0 and 100`),
    check('products_stock_check', sql`${t.stock} >= 0`),
    check('products_moq_check', sql`${t.minimumOrderQuantity} >= 1`),
    check('products_low_stock_check', sql`${t.lowStockThreshold} >= 0`),
    check('products_weight_check', sql`${t.weightG} > 0`),
    check('products_width_check', sql`${t.widthMm} > 0`),
    check('products_height_check', sql`${t.heightMm} > 0`),
    check('products_depth_check', sql`${t.depthMm} > 0`),
    index('products_category_idx').on(t.categoryId),
    index('products_brand_idx').on(t.brandId),
    index('products_active_idx')
      .on(t.id)
      .where(sql`${t.deletedAt} is null`),
  ],
).enableRLS()

export const productTags = pgTable(
  'product_tags',
  {
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    tagId: integer('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (t) => [
    primaryKey({ columns: [t.productId, t.tagId] }),
    index('product_tags_tag_idx').on(t.tagId),
  ],
).enableRLS()

export const productImages = pgTable(
  'product_images',
  {
    id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    position: integer('position').notNull(),
    isPrimary: boolean('is_primary').notNull().default(false),
  },
  (t) => [
    unique('product_images_product_position_unique').on(t.productId, t.position),
    uniqueIndex('product_images_one_primary_idx')
      .on(t.productId)
      .where(sql`${t.isPrimary}`),
    index('product_images_product_idx').on(t.productId),
  ],
).enableRLS()
