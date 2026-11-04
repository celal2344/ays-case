import { integer, pgTable, text } from 'drizzle-orm/pg-core'

export const categories = pgTable('categories', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const brands = pgTable('brands', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull().unique(),
})

export const warrantyPolicies = pgTable('warranty_policies', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  label: text('label').notNull().unique(),
})

export const shippingPolicies = pgTable('shipping_policies', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  label: text('label').notNull().unique(),
})

export const returnPolicies = pgTable('return_policies', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  label: text('label').notNull().unique(),
})

export const tags = pgTable('tags', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
})
