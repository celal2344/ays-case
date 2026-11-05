import { asc, eq, getTableColumns, sql, type SQL } from 'drizzle-orm'

import type { Database } from '../../../db/client'
import {
  brands,
  categories,
  productTags,
  products,
  returnPolicies,
  shippingPolicies,
  tags,
  warrantyPolicies,
} from '../../../db/schema'

/** The operations every lookup table has; the service decides what values go in. */
export interface LookupRepository<Row, Create, Set> {
  list: (db: Database) => Promise<Row[]>
  create: (db: Database, values: Create) => Promise<Row>
  /** An empty `set` just reads the row. */
  update: (db: Database, id: number, set: Set) => Promise<Row | undefined>
  remove: (db: Database, id: number) => Promise<boolean>
  inUse: (db: Database, id: number) => Promise<boolean>
}

const countOf = sql<number>`count(*)::int`
const used = async (count: Promise<{ n: number }[]>) => (await count)[0]!.n > 0

/** Whether any product matches `where` (a reference to the lookup row). */
const productsWhere = (db: Database, where: SQL) =>
  used(db.select({ n: countOf }).from(products).where(where))

type Slugged = { name: string; slug: string }
type Policy = { label: string }
type PolicyRow = { id: number; label: string }

export const categoryRepository: LookupRepository<
  typeof categories.$inferSelect,
  Slugged & { sortOrder: number },
  Partial<Slugged & { sortOrder: number }>
> = {
  list: (db) =>
    db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.name)),
  create: async (db, values) => (await db.insert(categories).values(values).returning())[0]!,
  update: async (db, id, set) => {
    if (Object.keys(set).length === 0) {
      return (await db.select().from(categories).where(eq(categories.id, id)))[0]
    }
    return (await db.update(categories).set(set).where(eq(categories.id, id)).returning())[0]
  },
  remove: async (db, id) =>
    (await db.delete(categories).where(eq(categories.id, id)).returning({ id: categories.id }))
      .length > 0,
  inUse: (db, id) => productsWhere(db, eq(products.categoryId, id)),
}

export const brandRepository: LookupRepository<
  typeof brands.$inferSelect,
  Slugged,
  Partial<Slugged>
> = {
  list: (db) => db.select().from(brands).orderBy(asc(brands.name)),
  create: async (db, values) => (await db.insert(brands).values(values).returning())[0]!,
  update: async (db, id, set) => {
    if (Object.keys(set).length === 0) {
      return (await db.select().from(brands).where(eq(brands.id, id)))[0]
    }
    return (await db.update(brands).set(set).where(eq(brands.id, id)).returning())[0]
  },
  remove: async (db, id) =>
    (await db.delete(brands).where(eq(brands.id, id)).returning({ id: brands.id })).length > 0,
  inUse: (db, id) => productsWhere(db, eq(products.brandId, id)),
}

export const tagRepository: LookupRepository<
  typeof tags.$inferSelect & { productCount?: number },
  Slugged,
  Partial<Slugged>
> = {
  list: (db) =>
    db
      .select({
        ...getTableColumns(tags),
        productCount: sql<number>`(select count(*)::int from ${productTags} where ${productTags.tagId} = ${tags.id})`,
      })
      .from(tags)
      .orderBy(asc(tags.name)),
  create: async (db, values) => (await db.insert(tags).values(values).returning())[0]!,
  update: async (db, id, set) => {
    if (Object.keys(set).length === 0) {
      return (await db.select().from(tags).where(eq(tags.id, id)))[0]
    }
    return (await db.update(tags).set(set).where(eq(tags.id, id)).returning())[0]
  },
  remove: async (db, id) =>
    (await db.delete(tags).where(eq(tags.id, id)).returning({ id: tags.id })).length > 0,
  // product_tags cascades, so the database would not refuse: count the links ourselves
  inUse: (db, id) =>
    used(db.select({ n: countOf }).from(productTags).where(eq(productTags.tagId, id))),
}

function policyRepository(
  table: typeof warrantyPolicies | typeof shippingPolicies | typeof returnPolicies,
  usedBy:
    | typeof products.warrantyPolicyId
    | typeof products.shippingPolicyId
    | typeof products.returnPolicyId,
): LookupRepository<PolicyRow, Policy, Partial<Policy>> {
  return {
    list: (db) => db.select().from(table).orderBy(asc(table.label)),
    create: async (db, values) => (await db.insert(table).values(values).returning())[0]!,
    update: async (db, id, set) => {
      if (set.label === undefined) {
        return (await db.select().from(table).where(eq(table.id, id)))[0]
      }
      return (
        await db.update(table).set({ label: set.label }).where(eq(table.id, id)).returning()
      )[0]
    },
    remove: async (db, id) =>
      (await db.delete(table).where(eq(table.id, id)).returning({ id: table.id })).length > 0,
    inUse: (db, id) => productsWhere(db, eq(usedBy, id)),
  }
}

export const warrantyRepository = policyRepository(warrantyPolicies, products.warrantyPolicyId)
export const shippingRepository = policyRepository(shippingPolicies, products.shippingPolicyId)
export const returnRepository = policyRepository(returnPolicies, products.returnPolicyId)
