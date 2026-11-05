import { asc, eq, getTableColumns, sql } from 'drizzle-orm'

import { getDb, type Database } from '../../../db/client'
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
import { dbError, duplicateField, toConflict } from '../../../utils/db-errors'
import { AppError, appError } from '../../../utils/errors'

/** `Çanta & Çocuk` → `canta-cocuk`; used when a slug is not given. */
export function slugify(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ı/g, 'i')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** A duplicate name, slug or label as the 409 the client gets; anything else via `dbError`. */
function writeError(error: unknown, op: string, what: string, meta: Record<string, unknown>) {
  if (error instanceof AppError) return error
  const conflict = toConflict(error)
  const where = `admin.lookups.${op}`
  if (conflict?.kind === 'duplicate') {
    const field = duplicateField(conflict.constraint)
    const message = `${what} with this ${field} already exists`
    return appError('duplicate', message, where, { ...meta, field })
  }
  if (conflict?.kind === 'in_use') {
    return appError('in_use', `${what} is still used by products`, where, meta)
  }
  return dbError(error, where, meta)
}

/** The five operations every lookup table has; each kind below fills them with its own table. */
export interface LookupOps<Row, Create, Patch> {
  what: string
  list: (db: Database) => Promise<Row[]>
  create: (db: Database, input: Create) => Promise<Row>
  update: (db: Database, id: number, patch: Patch) => Promise<Row | undefined>
  remove: (db: Database, id: number) => Promise<boolean>
  inUse: (db: Database, id: number) => Promise<boolean>
}

export function lookupService<Row, Create, Patch>(ops: LookupOps<Row, Create, Patch>) {
  const missing = (op: string, id: number) =>
    appError('not_found', `${ops.what} not found`, `admin.lookups.${op}`, {
      what: ops.what,
      id,
    })
  return {
    list: () => ops.list(getDb()),
    async create(input: Create): Promise<Row> {
      try {
        return await ops.create(getDb(), input)
      } catch (error) {
        throw writeError(error, 'create', ops.what, { what: ops.what })
      }
    },
    async update(id: number, patch: Patch): Promise<Row> {
      try {
        const row = await ops.update(getDb(), id, patch)
        if (!row) throw missing('update', id)
        return row
      } catch (error) {
        throw writeError(error, 'update', ops.what, { what: ops.what, id })
      }
    },
    async remove(id: number): Promise<void> {
      const db = getDb()
      if (await ops.inUse(db, id)) {
        const message = `${ops.what} is still used by products`
        throw appError('in_use', message, 'admin.lookups.remove', { what: ops.what, id })
      }
      try {
        if (!(await ops.remove(db, id))) throw missing('remove', id)
      } catch (error) {
        throw writeError(error, 'remove', ops.what, { what: ops.what, id })
      }
    },
  }
}

const used = async (count: Promise<{ n: number }[]>) => (await count)[0]!.n > 0
const countOf = sql<number>`count(*)::int`

type SluggedCreate = { name: string; slug?: string | undefined; sortOrder?: number | undefined }
type SluggedPatch = Partial<SluggedCreate>
const slugOf = (input: SluggedPatch) =>
  input.slug ?? (input.name === undefined ? undefined : slugify(input.name))

export const categoryService = lookupService<
  typeof categories.$inferSelect,
  SluggedCreate,
  SluggedPatch
>({
  what: 'Category',
  list: (db) =>
    db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.name)),
  create: async (db, input) => {
    const [row] = await db
      .insert(categories)
      .values({
        name: input.name,
        slug: slugOf(input) ?? slugify(input.name),
        sortOrder: input.sortOrder ?? 0,
      })
      .returning()
    return row!
  },
  update: async (db, id, patch) => {
    const set = {
      ...(patch.name === undefined ? {} : { name: patch.name }),
      ...(slugOf(patch) === undefined ? {} : { slug: slugOf(patch)! }),
      ...(patch.sortOrder === undefined ? {} : { sortOrder: patch.sortOrder }),
    }
    if (Object.keys(set).length === 0) {
      return (await db.select().from(categories).where(eq(categories.id, id)))[0]
    }
    return (await db.update(categories).set(set).where(eq(categories.id, id)).returning())[0]
  },
  remove: async (db, id) =>
    (await db.delete(categories).where(eq(categories.id, id)).returning({ id: categories.id }))
      .length > 0,
  inUse: (db, id) =>
    used(db.select({ n: countOf }).from(products).where(eq(products.categoryId, id))),
})

export const brandService = lookupService<typeof brands.$inferSelect, SluggedCreate, SluggedPatch>({
  what: 'Brand',
  list: (db) => db.select().from(brands).orderBy(asc(brands.name)),
  create: async (db, input) => {
    const [row] = await db
      .insert(brands)
      .values({ name: input.name, slug: slugOf(input) ?? slugify(input.name) })
      .returning()
    return row!
  },
  update: async (db, id, patch) => {
    const set = {
      ...(patch.name === undefined ? {} : { name: patch.name }),
      ...(slugOf(patch) === undefined ? {} : { slug: slugOf(patch)! }),
    }
    if (Object.keys(set).length === 0) {
      return (await db.select().from(brands).where(eq(brands.id, id)))[0]
    }
    return (await db.update(brands).set(set).where(eq(brands.id, id)).returning())[0]
  },
  remove: async (db, id) =>
    (await db.delete(brands).where(eq(brands.id, id)).returning({ id: brands.id })).length > 0,
  inUse: (db, id) => used(db.select({ n: countOf }).from(products).where(eq(products.brandId, id))),
})

export const tagService = lookupService<
  typeof tags.$inferSelect & { productCount?: number },
  SluggedCreate,
  SluggedPatch
>({
  what: 'Tag',
  list: (db) =>
    db
      .select({
        ...getTableColumns(tags),
        productCount: sql<number>`(select count(*)::int from ${productTags} where ${productTags.tagId} = ${tags.id})`,
      })
      .from(tags)
      .orderBy(asc(tags.name)),
  create: async (db, input) => {
    const [row] = await db
      .insert(tags)
      .values({ name: input.name, slug: slugOf(input) ?? slugify(input.name) })
      .returning()
    return row!
  },
  update: async (db, id, patch) => {
    const set = {
      ...(patch.name === undefined ? {} : { name: patch.name }),
      ...(slugOf(patch) === undefined ? {} : { slug: slugOf(patch)! }),
    }
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
})

type PolicyRow = { id: number; label: string }
type PolicyCreate = { label: string }
type PolicyPatch = Partial<PolicyCreate>

export const warrantyService = lookupService<PolicyRow, PolicyCreate, PolicyPatch>({
  what: 'Warranty policy',
  list: (db) => db.select().from(warrantyPolicies).orderBy(asc(warrantyPolicies.label)),
  create: async (db, input) => (await db.insert(warrantyPolicies).values(input).returning())[0]!,
  update: async (db, id, patch) =>
    patch.label === undefined
      ? (await db.select().from(warrantyPolicies).where(eq(warrantyPolicies.id, id)))[0]
      : (
          await db
            .update(warrantyPolicies)
            .set({ label: patch.label })
            .where(eq(warrantyPolicies.id, id))
            .returning()
        )[0],
  remove: async (db, id) =>
    (
      await db
        .delete(warrantyPolicies)
        .where(eq(warrantyPolicies.id, id))
        .returning({ id: warrantyPolicies.id })
    ).length > 0,
  inUse: (db, id) =>
    used(db.select({ n: countOf }).from(products).where(eq(products.warrantyPolicyId, id))),
})

export const shippingService = lookupService<PolicyRow, PolicyCreate, PolicyPatch>({
  what: 'Shipping policy',
  list: (db) => db.select().from(shippingPolicies).orderBy(asc(shippingPolicies.label)),
  create: async (db, input) => (await db.insert(shippingPolicies).values(input).returning())[0]!,
  update: async (db, id, patch) =>
    patch.label === undefined
      ? (await db.select().from(shippingPolicies).where(eq(shippingPolicies.id, id)))[0]
      : (
          await db
            .update(shippingPolicies)
            .set({ label: patch.label })
            .where(eq(shippingPolicies.id, id))
            .returning()
        )[0],
  remove: async (db, id) =>
    (
      await db
        .delete(shippingPolicies)
        .where(eq(shippingPolicies.id, id))
        .returning({ id: shippingPolicies.id })
    ).length > 0,
  inUse: (db, id) =>
    used(db.select({ n: countOf }).from(products).where(eq(products.shippingPolicyId, id))),
})

export const returnService = lookupService<PolicyRow, PolicyCreate, PolicyPatch>({
  what: 'Return policy',
  list: (db) => db.select().from(returnPolicies).orderBy(asc(returnPolicies.label)),
  create: async (db, input) => (await db.insert(returnPolicies).values(input).returning())[0]!,
  update: async (db, id, patch) =>
    patch.label === undefined
      ? (await db.select().from(returnPolicies).where(eq(returnPolicies.id, id)))[0]
      : (
          await db
            .update(returnPolicies)
            .set({ label: patch.label })
            .where(eq(returnPolicies.id, id))
            .returning()
        )[0],
  remove: async (db, id) =>
    (
      await db
        .delete(returnPolicies)
        .where(eq(returnPolicies.id, id))
        .returning({ id: returnPolicies.id })
    ).length > 0,
  inUse: (db, id) =>
    used(db.select({ n: countOf }).from(products).where(eq(products.returnPolicyId, id))),
})
