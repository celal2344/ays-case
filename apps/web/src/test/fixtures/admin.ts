import type { ProductBody, ProductDetail, ProductPatchBody } from '@ays/validators'

import type { User } from '@/features/auth/schemas'

import { fixtureCategories, fixtureDetail, fixtureProducts } from './products'
import { fixtureUserList } from './users'

export interface LookupRecord {
  id: number
  name?: string
  slug?: string
  sortOrder?: number
  label?: string
}

export const LOOKUP_TABLES = [
  'categories',
  'brands',
  'tags',
  'warranty-policies',
  'shipping-policies',
  'return-policies',
] as const
export type LookupTable = (typeof LOOKUP_TABLES)[number]

export interface Failure {
  status: 404 | 409 | 422
  code: string
  message: string
}

export const isFailure = (value: unknown): value is Failure =>
  typeof value === 'object' && value !== null && 'code' in value && 'status' in value

const fail = (status: Failure['status'], code: string, message: string): Failure => ({
  status,
  code,
  message,
})
const notFound = (what: string) => fail(404, 'not_found', `No such ${what}`)
const duplicate = (field: string) => fail(409, 'duplicate', `That ${field} is taken`)

const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

function initialLookups(): Record<LookupTable, LookupRecord[]> {
  const brands = new Map<number, LookupRecord>()
  const tags = new Map<string, LookupRecord>()
  for (const product of fixtureProducts) {
    if (product.brand) brands.set(product.brand.id, { ...product.brand })
    for (const tag of product.tags) {
      if (!tags.has(tag.slug)) tags.set(tag.slug, { id: tags.size + 1, ...tag })
    }
  }
  return {
    categories: fixtureCategories.map((c, index) => ({ ...c, sortOrder: index })),
    brands: [...brands.values()],
    tags: [...tags.values()],
    'warranty-policies': [{ id: 1, label: '1 week warranty' }],
    'shipping-policies': [{ id: 1, label: 'Ships in 1 month' }],
    'return-policies': [{ id: 1, label: '30 days return policy' }],
  }
}

/**
 * The mocked API's admin side: soft-deletable products with their edits, and the users and lookup
 * tables an admin manages. It enforces the rules the real server owns (unique names, no deleting or
 * demoting yourself, never the last admin), so the UI is tested against its answers. Reset before
 * every test in `setup.ts`.
 */
export class FakeAdmin {
  users: User[] = []
  lookups = initialLookups()
  private edits = new Map<number, ProductDetail>()
  private created: ProductDetail[] = []
  private deletedAt = new Map<number, string>()
  private nextProductId = 1000
  private nextLookupId = 100
  private nextUserId = 1000

  constructor() {
    this.reset()
  }

  reset() {
    this.users = fixtureUserList.map((u) => ({ ...u }))
    this.lookups = initialLookups()
    this.edits.clear()
    this.created = []
    this.deletedAt.clear()
    this.nextProductId = 1000
    this.nextLookupId = 100
    this.nextUserId = 1000
  }

  // products

  private all(): ProductDetail[] {
    const base = fixtureProducts.map((p) => this.edits.get(p.id) ?? fixtureDetail(p.id)!)
    return [...this.created, ...base]
  }

  /** Every product with its soft-delete mark (`GET /admin/products`). */
  adminProducts() {
    return this.all().map((p) => ({ ...p, deletedAt: this.deletedAt.get(p.id) ?? null }))
  }

  /** The products the shop shows. */
  liveProducts(): ProductDetail[] {
    return this.all().filter((p) => !this.deletedAt.has(p.id))
  }

  liveProduct(id: number) {
    return this.liveProducts().find((p) => p.id === id)
  }

  private row(table: LookupTable, id: number | null | undefined) {
    return this.lookups[table].find((row) => row.id === id) ?? null
  }

  private apply(base: ProductDetail, body: ProductPatchBody): ProductDetail | Failure {
    const { images, tagIds, categoryId, brandId, warrantyPolicyId, shippingPolicyId, ...rest } =
      body
    const { returnPolicyId, ...scalars } = rest

    const category = categoryId === undefined ? base.category : this.row('categories', categoryId)
    if (!category) return fail(422, 'unknown_reference', 'Unknown category')
    const sku = scalars.sku ?? base.sku
    if (this.all().some((p) => p.id !== base.id && p.sku === sku)) return duplicate('sku')

    const brand = brandId === undefined ? base.brand : this.row('brands', brandId)
    const stock = scalars.stock ?? base.stock
    const lowStockThreshold = scalars.lowStockThreshold ?? base.lowStockThreshold
    const policy = (table: LookupTable, id: number | null | undefined) =>
      this.row(table, id) as { id: number; label: string } | null

    return {
      ...base,
      ...scalars,
      category: { id: category.id, slug: category.slug!, name: category.name! },
      brand: brand && { id: brand.id, slug: brand.slug!, name: brand.name! },
      tags:
        tagIds === undefined
          ? base.tags
          : this.lookups.tags
              .filter((tag) => tagIds.includes(tag.id))
              .map((tag) => ({ slug: tag.slug!, name: tag.name! })),
      images:
        images === undefined
          ? base.images
          : images.map((image, position) => ({
              url: image.url,
              position,
              isPrimary: image.isPrimary ?? position === 0,
            })),
      warranty:
        warrantyPolicyId === undefined
          ? base.warranty
          : policy('warranty-policies', warrantyPolicyId),
      shipping:
        shippingPolicyId === undefined
          ? base.shipping
          : policy('shipping-policies', shippingPolicyId),
      returnPolicy:
        returnPolicyId === undefined
          ? base.returnPolicy
          : policy('return-policies', returnPolicyId),
      availability: stock <= 0 ? 'out' : stock <= lowStockThreshold ? 'low' : 'in',
      thumbnail: images === undefined ? base.thumbnail : (images[0]?.url ?? null),
    }
  }

  createProduct(body: ProductBody): ProductDetail | Failure {
    const blank: ProductDetail = {
      ...fixtureDetail(1)!,
      id: this.nextProductId,
      sku: '',
      images: [],
      reviews: [],
      reviewCount: 0,
      rating: null,
    }
    const product = this.apply(blank, body)
    if (isFailure(product)) return product
    this.nextProductId += 1
    this.created.unshift(product)
    return product
  }

  updateProduct(id: number, body: ProductPatchBody): ProductDetail | Failure {
    const base = this.all().find((p) => p.id === id)
    if (!base) return notFound('product')
    const product = this.apply(base, body)
    if (isFailure(product)) return product
    const at = this.created.findIndex((p) => p.id === id)
    if (at >= 0) this.created[at] = product
    else this.edits.set(id, product)
    return product
  }

  deleteProduct(id: number): Failure | null {
    if (!this.liveProduct(id)) return notFound('product')
    this.deletedAt.set(id, new Date().toISOString())
    return null
  }

  restoreProduct(id: number): ProductDetail | Failure {
    const product = this.all().find((p) => p.id === id)
    if (!product || !this.deletedAt.has(id)) return notFound('product')
    this.deletedAt.delete(id)
    return product
  }

  // lookups

  createLookup(table: LookupTable, input: Omit<LookupRecord, 'id'>): LookupRecord | Failure {
    const row: LookupRecord = { id: this.nextLookupId, ...input }
    if (row.name !== undefined) row.slug = input.slug ?? slugify(row.name)
    if (row.slug && this.lookups[table].some((r) => r.slug === row.slug)) return duplicate('slug')
    this.nextLookupId += 1
    this.lookups[table].push(row)
    return row
  }

  updateLookup(table: LookupTable, id: number, input: Omit<LookupRecord, 'id'>) {
    const row = this.lookups[table].find((r) => r.id === id)
    if (!row) return notFound('row')
    Object.assign(row, Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)))
    return row
  }

  deleteLookup(table: LookupTable, id: number): Failure | null {
    const at = this.lookups[table].findIndex((r) => r.id === id)
    if (at < 0) return notFound('row')
    if (table === 'categories' && this.all().some((p) => p.category.id === id)) {
      return fail(409, 'in_use', 'Still used by products')
    }
    this.lookups[table].splice(at, 1)
    return null
  }

  // users

  private admins() {
    return this.users.filter((u) => u.role === 'admin')
  }

  private taken(input: { username?: string | null; email?: string }, exceptId?: string) {
    return this.users.some(
      (u) =>
        u.id !== exceptId &&
        ((input.username != null && u.username?.toLowerCase() === input.username.toLowerCase()) ||
          (input.email !== undefined && u.email.toLowerCase() === input.email.toLowerCase())),
    )
  }

  createUser(input: Omit<User, 'id' | 'image'> & { password: string }): User | Failure {
    if (this.taken(input)) return duplicate('username or email')
    const { password, ...rest } = input
    void password
    const user: User = { id: `user-${this.nextUserId}`, image: null, ...rest }
    this.nextUserId += 1
    this.users.push(user)
    return user
  }

  updateUser(id: string, patch: Partial<User>, actingId: string | null): User | Failure {
    const user = this.users.find((u) => u.id === id)
    if (!user) return notFound('user')
    if (this.taken(patch, id)) return duplicate('username or email')
    const demoting = user.role === 'admin' && patch.role !== undefined && patch.role !== 'admin'
    if (demoting && id === actingId) {
      return fail(409, 'cannot_demote_self', 'You cannot demote yourself')
    }
    if (demoting && this.admins().length === 1) {
      return fail(409, 'last_admin', 'The last admin cannot be demoted')
    }
    Object.assign(user, patch)
    return user
  }

  deleteUser(id: string, actingId: string | null): Failure | null {
    const user = this.users.find((u) => u.id === id)
    if (!user) return notFound('user')
    if (id === actingId) return fail(409, 'cannot_delete_self', 'You cannot delete yourself')
    if (user.role === 'admin' && this.admins().length === 1) {
      return fail(409, 'last_admin', 'The last admin cannot be deleted')
    }
    this.users = this.users.filter((u) => u.id !== id)
    return null
  }
}
