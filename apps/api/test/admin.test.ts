import type { ProductDetail } from '@ays/validators'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { getDb } from '../src/db/client'
import { cartItems, favorites, orderLines, productImages, user } from '../src/db/schema'
import { root } from '../src/root'
import { deleteUser } from '../src/modules/admin/users/service'
import { signIn, useSeededDatabase } from './helpers/test-db'

const request = (path: string, init?: RequestInit) => root.request(path, init)

let close: () => Promise<void>
let admin: string
let shopper: string

beforeAll(async () => {
  ;({ close } = await useSeededDatabase())
  admin = (await signIn(request, 'emilys', 'emilyspass')).cookie
  shopper = (await signIn(request, 'averyp', 'averyppass')).cookie
})
afterAll(async () => {
  await close()
})

const call = (cookie: string | undefined, method: string, path: string, body?: unknown) =>
  request(path, {
    method,
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })

const data = async <T>(res: Response) => ((await res.json()) as { data: T }).data
const code = async (res: Response) => ((await res.json()) as { code: string }).code

const newProduct = (over: Record<string, unknown> = {}) => ({
  title: 'Admin made lamp',
  description: 'A lamp created through the admin API.',
  sku: 'ADM-LAMP-1',
  barcode: null,
  categoryId: 1,
  brandId: null,
  priceCents: 2499,
  discountPercentage: 10,
  stock: 12,
  minimumOrderQuantity: 1,
  lowStockThreshold: 5,
  weightG: 800,
  widthMm: 120,
  heightMm: 300,
  depthMm: 120,
  warrantyPolicyId: null,
  shippingPolicyId: null,
  returnPolicyId: null,
  tagIds: [],
  images: [],
  ...over,
})

describe('every admin endpoint needs an admin', () => {
  const calls: [string, string, unknown?][] = [
    ['POST', '/api/products', newProduct()],
    ['PATCH', '/api/products/1', { title: 'x' }],
    ['DELETE', '/api/products/1'],
    ['POST', '/api/products/1/restore'],
    ['GET', '/api/admin/products'],
    ['GET', '/api/admin/categories'],
    ['POST', '/api/admin/categories', { name: 'Nope' }],
    ['PATCH', '/api/admin/categories/1', { name: 'Nope' }],
    ['DELETE', '/api/admin/categories/1'],
    ['GET', '/api/admin/brands'],
    ['POST', '/api/admin/tags', { name: 'Nope' }],
    ['DELETE', '/api/admin/warranty-policies/1'],
    ['GET', '/api/admin/shipping-policies'],
    ['POST', '/api/admin/return-policies', { label: 'Nope' }],
    ['POST', '/api/users', { username: 'nope' }],
    ['PATCH', '/api/users/user-2', { firstName: 'Nope' }],
    ['DELETE', '/api/users/user-2'],
  ]
  it.each(calls)(
    '%s %s: 401 without a session, 403 for a plain user',
    async (method, path, body) => {
      expect((await call(undefined, method, path, body)).status).toBe(401)
      expect((await call(shopper, method, path, body)).status).toBe(403)
    },
  )
})

describe('products', () => {
  it('creates a product with tags, two images (one primary) and a brand, and returns the detail', async () => {
    const res = await call(
      admin,
      'POST',
      '/api/products',
      newProduct({
        brandId: 1,
        warrantyPolicyId: 1,
        tagIds: [1, 2],
        images: [
          { url: 'https://img.test/a.webp' },
          { url: 'https://img.test/b.webp', isPrimary: true },
        ],
      }),
    )
    expect(res.status).toBe(201)
    const product = await data<ProductDetail>(res)
    expect(product).toMatchObject({
      title: 'Admin made lamp',
      sku: 'ADM-LAMP-1',
      priceCents: 2499,
      stock: 12,
      brand: { id: 1 },
      warranty: { id: 1 },
      thumbnail: 'https://img.test/b.webp',
    })
    expect(product.id).toBeGreaterThan(194)
    expect(product.tags).toHaveLength(2)
    expect(product.images.map((i) => [i.url, i.position, i.isPrimary])).toEqual([
      ['https://img.test/a.webp', 0, false],
      ['https://img.test/b.webp', 1, true],
    ])
    const shop = await call(undefined, 'GET', `/api/products/${product.id}`)
    expect(shop.status).toBe(200)
  })

  it('validates the limits with 422', async () => {
    for (const bad of [
      { title: 'x' },
      { description: 'short' },
      { priceCents: -1 },
      { priceCents: 9.5 },
      { discountPercentage: 101 },
      { stock: -1 },
      { minimumOrderQuantity: 0 },
      { weightG: 0 },
      { sku: '' },
      { images: [{ url: 'javascript:alert(1)' }] },
      { images: [{ url: 'http://a.test/1.png' }] },
      {
        images: [
          { url: 'https://a.test/1.png', isPrimary: true },
          { url: 'https://a.test/2.png', isPrimary: true },
        ],
      },
    ]) {
      const res = await call(admin, 'POST', '/api/products', newProduct({ sku: 'LIMIT-1', ...bad }))
      expect(res.status, JSON.stringify(bad)).toBe(422)
    }
  })

  it('refuses a taken sku or barcode with 409 and an unknown reference with 422', async () => {
    await call(admin, 'POST', '/api/products', newProduct({ sku: 'UNIQ-1', barcode: '123456' }))
    const sku = await call(admin, 'POST', '/api/products', newProduct({ sku: 'UNIQ-1' }))
    expect(sku.status).toBe(409)
    expect(await code(sku)).toBe('duplicate')
    const barcode = await call(
      admin,
      'POST',
      '/api/products',
      newProduct({ sku: 'UNIQ-2', barcode: '123456' }),
    )
    expect(barcode.status).toBe(409)
    const unknown = await call(
      admin,
      'POST',
      '/api/products',
      newProduct({ sku: 'UNIQ-3', categoryId: 9999 }),
    )
    expect(unknown.status).toBe(422)
    expect(await code(unknown)).toBe('unknown_reference')
  })

  it('updates fields, and tags and images replace the old ones with the invariants kept', async () => {
    const created = await data<ProductDetail>(
      await call(
        admin,
        'POST',
        '/api/products',
        newProduct({
          sku: 'PATCH-1',
          brandId: 1,
          tagIds: [1, 2],
          images: [{ url: 'https://img.test/1.webp' }, { url: 'https://img.test/2.webp' }],
        }),
      ),
    )
    const res = await call(admin, 'PATCH', `/api/products/${created.id}`, {
      priceCents: 1999,
      brandId: null,
      tagIds: [3],
      images: [
        { url: 'https://img.test/x.webp' },
        { url: 'https://img.test/y.webp' },
        { url: 'https://img.test/z.webp', isPrimary: true },
      ],
    })
    expect(res.status).toBe(200)
    const updated = await data<ProductDetail>(res)
    expect(updated).toMatchObject({ priceCents: 1999, brand: null, title: created.title })
    expect(updated.tags).toHaveLength(1)
    expect(updated.images.map((i) => i.position)).toEqual([0, 1, 2])
    expect(updated.images.filter((i) => i.isPrimary)).toHaveLength(1)
    expect(updated.thumbnail).toBe('https://img.test/z.webp')
    expect(updated.sku).toBe('PATCH-1')
    const rows = await getDb()
      .select()
      .from(productImages)
      .where(eq(productImages.productId, created.id))
    expect(rows).toHaveLength(3)
    expect(Date.parse(updated.updatedAt)).toBeGreaterThanOrEqual(Date.parse(created.updatedAt))

    expect(
      (await call(admin, 'PATCH', '/api/products/99999', { title: 'Nothing here' })).status,
    ).toBe(404)
    expect(
      (await call(admin, 'PATCH', `/api/products/${created.id}`, { sku: 'ADM-LAMP-1' })).status,
    ).toBe(409)
    expect(
      (await call(admin, 'PATCH', `/api/products/${created.id}`, { priceCents: -5 })).status,
    ).toBe(422)
  })

  it('soft delete hides it, empties carts and favorites, keeps order lines; restore brings it back', async () => {
    const created = await data<ProductDetail>(
      await call(admin, 'POST', '/api/products', newProduct({ sku: 'SOFT-1' })),
    )
    await call(shopper, 'POST', '/api/cart/items', { productId: created.id, quantity: 1 })
    await call(shopper, 'PUT', `/api/favorites/${created.id}`)
    await call(shopper, 'POST', '/api/orders', {
      shipping: {
        fullName: 'Avery Perez',
        address: '1 Main Street',
        city: 'Izmir',
        phone: '5551112233',
      },
    })
    await call(shopper, 'POST', '/api/cart/items', { productId: created.id, quantity: 1 })
    expect((await call(admin, 'DELETE', `/api/products/${created.id}`)).status).toBe(204)

    const list = await data<{ id: number }[]>(await call(undefined, 'GET', '/api/products'))
    expect(list.some((p) => p.id === created.id)).toBe(false)
    expect((await call(undefined, 'GET', `/api/products/${created.id}`)).status).toBe(404)
    expect(
      await getDb().select().from(cartItems).where(eq(cartItems.productId, created.id)),
    ).toEqual([])
    expect(
      await getDb().select().from(favorites).where(eq(favorites.productId, created.id)),
    ).toEqual([])
    const lines = await getDb()
      .select()
      .from(orderLines)
      .where(eq(orderLines.productId, created.id))
    expect(lines).toHaveLength(1)

    const all = await data<{ id: number; deletedAt: string | null }[]>(
      await call(admin, 'GET', '/api/admin/products'),
    )
    expect(all.find((p) => p.id === created.id)?.deletedAt).toEqual(expect.any(String))
    expect(all.find((p) => p.id === 1)?.deletedAt).toBeNull()

    const restored = await call(admin, 'POST', `/api/products/${created.id}/restore`)
    expect(restored.status).toBe(200)
    expect((await call(undefined, 'GET', `/api/products/${created.id}`)).status).toBe(200)
    expect((await call(admin, 'DELETE', '/api/products/99999')).status).toBe(404)
    expect((await call(admin, 'POST', '/api/products/99999/restore')).status).toBe(404)
  })
})

describe('lookups', () => {
  it('creates a category with a generated slug, updates it, and refuses duplicates', async () => {
    const created = await call(admin, 'POST', '/api/admin/categories', {
      name: 'Çanta & Çocuk',
      sortOrder: 3,
    })
    expect(created.status).toBe(201)
    const category = await data<{ id: number; slug: string; sortOrder: number }>(created)
    expect(category).toMatchObject({ slug: 'canta-cocuk', sortOrder: 3 })

    const dup = await call(admin, 'POST', '/api/admin/categories', {
      name: 'Another',
      slug: 'canta-cocuk',
    })
    expect(dup.status).toBe(409)
    expect(await code(dup)).toBe('duplicate')

    const renamed = await call(admin, 'PATCH', `/api/admin/categories/${category.id}`, {
      name: 'Bags',
      slug: 'bags',
    })
    expect(await data(renamed)).toMatchObject({ name: 'Bags', slug: 'bags' })
    expect(
      (await call(admin, 'PATCH', '/api/admin/categories/99999', { name: 'Nope' })).status,
    ).toBe(404)
    expect(
      (await call(admin, 'POST', '/api/admin/categories', { name: 'Bad', slug: 'Not A Slug' }))
        .status,
    ).toBe(422)

    expect((await call(admin, 'DELETE', `/api/admin/categories/${category.id}`)).status).toBe(204)
    expect((await call(admin, 'DELETE', `/api/admin/categories/${category.id}`)).status).toBe(404)
  })

  it('refuses to delete what products still use with 409 in_use', async () => {
    const usedCategory = await call(admin, 'DELETE', '/api/admin/categories/1')
    expect(usedCategory.status).toBe(409)
    expect(await code(usedCategory)).toBe('in_use')

    const brand = await data<{ id: number }>(
      await call(admin, 'POST', '/api/admin/brands', { name: 'Lampco' }),
    )
    const tag = await data<{ id: number }>(
      await call(admin, 'POST', '/api/admin/tags', { name: 'Glow' }),
    )
    const warranty = await data<{ id: number }>(
      await call(admin, 'POST', '/api/admin/warranty-policies', { label: '10 year warranty' }),
    )
    const shipping = await data<{ id: number }>(
      await call(admin, 'POST', '/api/admin/shipping-policies', { label: 'Ships tomorrow' }),
    )
    const returns = await data<{ id: number }>(
      await call(admin, 'POST', '/api/admin/return-policies', { label: '90 day returns' }),
    )
    await call(
      admin,
      'POST',
      '/api/products',
      newProduct({
        sku: 'LOOKUP-1',
        brandId: brand.id,
        tagIds: [tag.id],
        warrantyPolicyId: warranty.id,
        shippingPolicyId: shipping.id,
        returnPolicyId: returns.id,
      }),
    )
    for (const path of [
      `/api/admin/brands/${brand.id}`,
      `/api/admin/tags/${tag.id}`,
      `/api/admin/warranty-policies/${warranty.id}`,
      `/api/admin/shipping-policies/${shipping.id}`,
      `/api/admin/return-policies/${returns.id}`,
    ]) {
      const res = await call(admin, 'DELETE', path)
      expect(res.status, path).toBe(409)
      expect(await code(res)).toBe('in_use')
    }
    const policy = await call(admin, 'POST', '/api/admin/warranty-policies', {
      label: '10 year warranty',
    })
    expect(policy.status).toBe(409)
  })

  it('lists, and deletes an unused brand, tag and policy', async () => {
    const brand = await data<{ id: number }>(
      await call(admin, 'POST', '/api/admin/brands', { name: 'Unused Co' }),
    )
    expect(
      (await data<{ name: string }[]>(await call(admin, 'GET', '/api/admin/brands'))).some(
        (b) => b.name === 'Unused Co',
      ),
    ).toBe(true)
    expect((await call(admin, 'DELETE', `/api/admin/brands/${brand.id}`)).status).toBe(204)
    const policy = await data<{ id: number }>(
      await call(admin, 'POST', '/api/admin/return-policies', { label: 'Never used' }),
    )
    expect((await call(admin, 'DELETE', `/api/admin/return-policies/${policy.id}`)).status).toBe(
      204,
    )
  })
})

describe('users', () => {
  const body = (over: Record<string, unknown> = {}) => ({
    username: 'nina',
    firstName: 'Nina',
    lastName: 'Admin',
    email: 'nina@example.com',
    role: 'admin',
    password: 'initial-pass-1',
    ...over,
  })

  it('creates a user who can sign in with the initial password', async () => {
    const res = await call(admin, 'POST', '/api/users', body())
    expect(res.status).toBe(201)
    const created = await data<{ id: string; username: string; role: string }>(res)
    expect(created).toMatchObject({ username: 'nina', role: 'admin' })
    const login = await signIn(request, 'nina', 'initial-pass-1')
    expect(login.res.status).toBe(200)
    const session = await call(login.cookie, 'GET', '/api/users')
    expect(session.status).toBe(200) // an admin
    expect((await signIn(request, 'nina', 'wrong-password')).res.status).toBe(401)
  })

  it('validates the body and refuses a taken username or email', async () => {
    for (const bad of [
      { username: 'ab' },
      { email: 'nope' },
      { password: 'short' },
      { role: 'boss' },
    ]) {
      expect(
        (
          await call(
            admin,
            'POST',
            '/api/users',
            body({ username: 'val', email: 'v@example.com', ...bad }),
          )
        ).status,
      ).toBe(422)
    }
    const dupName = await call(admin, 'POST', '/api/users', body({ email: 'other@example.com' }))
    expect(dupName.status).toBe(409)
    expect(await code(dupName)).toBe('duplicate')
    const dupEmail = await call(admin, 'POST', '/api/users', body({ username: 'nina2' }))
    expect(dupEmail.status).toBe(409)
  })

  it('creates a moderator', async () => {
    const res = await call(
      admin,
      'POST',
      '/api/users',
      body({ username: 'mod', email: 'mod@example.com', role: 'moderator' }),
    )
    expect(await data(res)).toMatchObject({ role: 'moderator' })
  })

  it("changes names, email and role; a demoted user's sessions stop working", async () => {
    const login = await signIn(request, 'nina', 'initial-pass-1')
    expect((await call(login.cookie, 'GET', '/api/users')).status).toBe(200)
    const id = (
      await getDb().select({ id: user.id }).from(user).where(eq(user.username, 'nina'))
    )[0]!.id

    const renamed = await call(admin, 'PATCH', `/api/users/${id}`, {
      firstName: 'Nin',
      email: 'nin@example.com',
    })
    expect(await data(renamed)).toMatchObject({ firstName: 'Nin', email: 'nin@example.com' })

    const demoted = await call(admin, 'PATCH', `/api/users/${id}`, { role: 'user' })
    expect(await data(demoted)).toMatchObject({ role: 'user' })
    expect((await call(login.cookie, 'GET', '/api/users')).status).toBe(401)
    expect((await call(admin, 'PATCH', '/api/users/nobody', { firstName: 'X' })).status).toBe(404)
    expect((await call(admin, 'PATCH', `/api/users/${id}`, { username: 'emilys' })).status).toBe(
      409,
    )
  })

  it('guards: you cannot delete or demote yourself', async () => {
    const self = await call(admin, 'DELETE', '/api/users/user-1')
    expect(self.status).toBe(409)
    expect(await code(self)).toBe('cannot_delete_self')
    const demote = await call(admin, 'PATCH', '/api/users/user-1', { role: 'user' })
    expect(demote.status).toBe(409)
    expect(await code(demote)).toBe('cannot_demote_self')
  })

  it('guards: the last admin cannot be deleted or demoted', async () => {
    await getDb().update(user).set({ role: 'user' }).where(eq(user.role, 'admin'))
    await getDb().update(user).set({ role: 'admin' }).where(eq(user.id, 'user-2'))
    // the API can only reach this with an actor who is not that admin, so the service is called directly
    const result = await deleteUser('user-2', 'user-1')
    expect(result).toMatchObject({ ok: false, code: 'last_admin' })
    await getDb().update(user).set({ role: 'admin' }).where(eq(user.id, 'user-1'))
    await getDb().update(user).set({ role: 'user' }).where(eq(user.id, 'user-2'))
    const demote = await call(admin, 'PATCH', '/api/users/user-2', { role: 'user' })
    expect(demote.status).toBe(200) // not an admin any more: nothing to guard
  })

  it('deletes a user; their session and their data go with them', async () => {
    const victim = await data<{ id: string }>(
      await call(
        admin,
        'POST',
        '/api/users',
        body({ username: 'gone', email: 'gone@example.com', role: 'user' }),
      ),
    )
    const login = await signIn(request, 'gone', 'initial-pass-1')
    await call(login.cookie, 'POST', '/api/cart/items', { productId: 1, quantity: 1 })
    expect((await call(admin, 'DELETE', `/api/users/${victim.id}`)).status).toBe(204)
    expect((await call(login.cookie, 'GET', '/api/cart')).status).toBe(401)
    expect(await getDb().select().from(cartItems).where(eq(cartItems.userId, victim.id))).toEqual(
      [],
    )
    expect((await call(admin, 'DELETE', `/api/users/${victim.id}`)).status).toBe(404)
    expect((await signIn(request, 'gone', 'initial-pass-1')).res.status).toBe(401)
  })
})

describe('tag list (admin)', () => {
  it('says how many products use each tag, for the tag picker', async () => {
    const res = await call(admin, 'GET', '/api/admin/tags')
    expect(res.status).toBe(200)
    const { data: tags } = (await res.json()) as {
      data: { slug: string; productCount?: number }[]
    }
    expect(tags.length).toBeGreaterThan(0)
    expect(tags.every((tag) => typeof tag.productCount === 'number')).toBe(true)
    expect(tags.some((tag) => (tag.productCount ?? 0) > 0)).toBe(true)
  })
})
