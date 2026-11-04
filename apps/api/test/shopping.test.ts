import { MAX_RECENTLY_VIEWED } from '@ays/validators'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { getDb } from '../src/db/client'
import { cartItems, favorites, products, recentlyViewed, user } from '../src/db/schema'
import { root } from '../src/root'
import { signIn, useSeededDatabase } from './helpers/test-db'

const request = (path: string, init?: RequestInit) => root.request(path, init)

let close: () => Promise<void>
let emily: string
let avery: string

beforeAll(async () => {
  ;({ close } = await useSeededDatabase())
  emily = (await signIn(request, 'emilys', 'emilyspass')).cookie
  avery = (await signIn(request, 'averyp', 'averyppass')).cookie
})
afterAll(async () => {
  await close()
})
beforeEach(async () => {
  const db = getDb()
  await db.delete(cartItems)
  await db.delete(favorites)
  await db.delete(recentlyViewed)
  await db.update(products).set({ stock: 50, deletedAt: null })
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

const ids = async (cookie: string, path: string) =>
  ((await (await call(cookie, 'GET', path)).json()) as { data: number[] }).data
const cart = async (cookie: string) =>
  (
    (await (await call(cookie, 'GET', '/api/cart')).json()) as {
      data: { productId: number; quantity: number; addedAt: string }[]
    }
  ).data

describe('every shopping route needs a session', () => {
  it.each([
    ['GET', '/api/cart'],
    ['POST', '/api/cart/items'],
    ['PUT', '/api/cart/items/1'],
    ['DELETE', '/api/cart/items/1'],
    ['DELETE', '/api/cart'],
    ['GET', '/api/favorites'],
    ['PUT', '/api/favorites/1'],
    ['DELETE', '/api/favorites/1'],
    ['GET', '/api/recently-viewed'],
    ['PUT', '/api/recently-viewed/1'],
    ['DELETE', '/api/recently-viewed'],
  ])('%s %s answers 401', async (method, path) => {
    const res = await call(undefined, method, path, method === 'GET' ? undefined : {})
    expect(res.status).toBe(401)
    expect(await res.json()).toMatchObject({ code: 'unauthorized' })
  })
})

describe('cart', () => {
  it('adds a line, adds to it again, and lists newest first', async () => {
    const first = await call(emily, 'POST', '/api/cart/items', { productId: 1, quantity: 2 })
    expect(first.status).toBe(200)
    expect(await first.json()).toMatchObject({ data: { productId: 1, quantity: 2 } })
    await call(emily, 'POST', '/api/cart/items', { productId: 2, quantity: 1 })
    const again = await call(emily, 'POST', '/api/cart/items', { productId: 1, quantity: 3 })
    expect(await again.json()).toMatchObject({ data: { productId: 1, quantity: 5 } })
    expect((await cart(emily)).map((l) => [l.productId, l.quantity])).toEqual([
      [2, 1],
      [1, 5],
    ])
  })

  it('caps an add at stock, on the first add and on top of an existing line', async () => {
    await getDb().update(products).set({ stock: 4 }).where(eq(products.id, 1))
    const first = await call(emily, 'POST', '/api/cart/items', { productId: 1, quantity: 10 })
    expect(await first.json()).toMatchObject({ data: { quantity: 4 } })
    const second = await call(emily, 'POST', '/api/cart/items', { productId: 1, quantity: 1 })
    expect(await second.json()).toMatchObject({ data: { quantity: 4 } })
  })

  it('refuses an out-of-stock product with 409 and an unknown or deleted one with 404', async () => {
    await getDb().update(products).set({ stock: 0 }).where(eq(products.id, 1))
    const out = await call(emily, 'POST', '/api/cart/items', { productId: 1, quantity: 1 })
    expect(out.status).toBe(409)
    expect(await out.json()).toMatchObject({ code: 'out_of_stock' })

    const unknown = await call(emily, 'POST', '/api/cart/items', { productId: 99999, quantity: 1 })
    expect(unknown.status).toBe(404)

    await getDb().update(products).set({ deletedAt: new Date() }).where(eq(products.id, 2))
    const deleted = await call(emily, 'POST', '/api/cart/items', { productId: 2, quantity: 1 })
    expect(deleted.status).toBe(404)
  })

  it('sets a quantity clamped to 1..stock', async () => {
    await getDb().update(products).set({ stock: 6 }).where(eq(products.id, 1))
    const set = await call(emily, 'PUT', '/api/cart/items/1', { quantity: 3 })
    expect(await set.json()).toMatchObject({ data: { quantity: 3 } })
    const high = await call(emily, 'PUT', '/api/cart/items/1', { quantity: 100 })
    expect(await high.json()).toMatchObject({ data: { quantity: 6 } })
    expect((await call(emily, 'PUT', '/api/cart/items/99999', { quantity: 1 })).status).toBe(404)
  })

  it('rejects a quantity below 1 and a bad id with 422', async () => {
    for (const quantity of [0, -1, 1.5]) {
      const res = await call(emily, 'PUT', '/api/cart/items/1', { quantity })
      expect(res.status).toBe(422)
      expect(await res.json()).toMatchObject({ code: 'validation_error' })
    }
    expect(
      (await call(emily, 'POST', '/api/cart/items', { productId: 1, quantity: 0 })).status,
    ).toBe(422)
    expect((await call(emily, 'PUT', '/api/cart/items/abc', { quantity: 1 })).status).toBe(422)
  })

  it('removes one line and empties the cart; both are idempotent', async () => {
    await call(emily, 'POST', '/api/cart/items', { productId: 1, quantity: 1 })
    await call(emily, 'POST', '/api/cart/items', { productId: 2, quantity: 1 })
    expect((await call(emily, 'DELETE', '/api/cart/items/1')).status).toBe(204)
    expect((await call(emily, 'DELETE', '/api/cart/items/1')).status).toBe(204)
    expect((await cart(emily)).map((l) => l.productId)).toEqual([2])
    expect((await call(emily, 'DELETE', '/api/cart')).status).toBe(204)
    expect((await call(emily, 'DELETE', '/api/cart')).status).toBe(204)
    expect(await cart(emily)).toEqual([])
  })

  it('hides lines of soft-deleted products', async () => {
    await call(emily, 'POST', '/api/cart/items', { productId: 1, quantity: 1 })
    await getDb().update(products).set({ deletedAt: new Date() }).where(eq(products.id, 1))
    expect(await cart(emily)).toEqual([])
  })

  it("keeps users apart: B never sees or changes A's lines", async () => {
    await call(emily, 'POST', '/api/cart/items', { productId: 1, quantity: 2 })
    expect(await cart(avery)).toEqual([])
    await call(avery, 'DELETE', '/api/cart/items/1')
    await call(avery, 'DELETE', '/api/cart')
    expect((await cart(emily)).map((l) => l.quantity)).toEqual([2])
    await call(avery, 'PUT', '/api/cart/items/1', { quantity: 7 })
    expect((await cart(emily)).map((l) => l.quantity)).toEqual([2])
  })

  it('ignores a user id smuggled into the body', async () => {
    await call(avery, 'POST', '/api/cart/items', { productId: 1, quantity: 1, userId: 'user-1' })
    expect(await cart(emily)).toEqual([])
    expect(await cart(avery)).toHaveLength(1)
  })
})

describe('favorites', () => {
  it('adds idempotently, lists newest first and removes idempotently', async () => {
    expect((await call(emily, 'PUT', '/api/favorites/3')).status).toBe(204)
    expect((await call(emily, 'PUT', '/api/favorites/3')).status).toBe(204)
    await call(emily, 'PUT', '/api/favorites/5')
    expect(await ids(emily, '/api/favorites')).toEqual([5, 3])
    expect((await call(emily, 'DELETE', '/api/favorites/3')).status).toBe(204)
    expect((await call(emily, 'DELETE', '/api/favorites/3')).status).toBe(204)
    expect(await ids(emily, '/api/favorites')).toEqual([5])
  })

  it('answers 404 for an unknown or deleted product and 422 for a bad id', async () => {
    expect((await call(emily, 'PUT', '/api/favorites/99999')).status).toBe(404)
    await getDb().update(products).set({ deletedAt: new Date() }).where(eq(products.id, 4))
    expect((await call(emily, 'PUT', '/api/favorites/4')).status).toBe(404)
    expect((await call(emily, 'PUT', '/api/favorites/0')).status).toBe(422)
  })

  it('hides soft-deleted products and keeps users apart', async () => {
    await call(emily, 'PUT', '/api/favorites/3')
    await call(emily, 'PUT', '/api/favorites/5')
    await getDb().update(products).set({ deletedAt: new Date() }).where(eq(products.id, 3))
    expect(await ids(emily, '/api/favorites')).toEqual([5])
    expect(await ids(avery, '/api/favorites')).toEqual([])
    await call(avery, 'DELETE', '/api/favorites/5')
    expect(await ids(emily, '/api/favorites')).toEqual([5])
  })
})

describe('recently viewed', () => {
  it('records a view, moves a repeat to the front and lists newest first', async () => {
    for (const id of [1, 2, 3])
      expect((await call(emily, 'PUT', `/api/recently-viewed/${id}`)).status).toBe(204)
    expect(await ids(emily, '/api/recently-viewed')).toEqual([3, 2, 1])
    await call(emily, 'PUT', '/api/recently-viewed/1')
    expect(await ids(emily, '/api/recently-viewed')).toEqual([1, 3, 2])
  })

  it('keeps only the 12 newest', async () => {
    for (let id = 1; id <= 15; id++) await call(emily, 'PUT', `/api/recently-viewed/${id}`)
    const list = await ids(emily, '/api/recently-viewed')
    expect(list).toHaveLength(MAX_RECENTLY_VIEWED)
    expect(list[0]).toBe(15)
    expect(list.at(-1)).toBe(4)
    const rows = await getDb()
      .select()
      .from(recentlyViewed)
      .where(eq(recentlyViewed.userId, 'user-1'))
    expect(rows).toHaveLength(MAX_RECENTLY_VIEWED)
  })

  it('trims one user without touching another, and clears idempotently', async () => {
    for (let id = 1; id <= 14; id++) await call(emily, 'PUT', `/api/recently-viewed/${id}`)
    await call(avery, 'PUT', '/api/recently-viewed/1')
    expect(await ids(avery, '/api/recently-viewed')).toEqual([1])
    expect((await call(avery, 'DELETE', '/api/recently-viewed')).status).toBe(204)
    expect((await call(avery, 'DELETE', '/api/recently-viewed')).status).toBe(204)
    expect(await ids(avery, '/api/recently-viewed')).toEqual([])
    expect(await ids(emily, '/api/recently-viewed')).toHaveLength(MAX_RECENTLY_VIEWED)
  })

  it('answers 404 for an unknown product and hides soft-deleted ones', async () => {
    expect((await call(emily, 'PUT', '/api/recently-viewed/99999')).status).toBe(404)
    await call(emily, 'PUT', '/api/recently-viewed/1')
    await getDb().update(products).set({ deletedAt: new Date() }).where(eq(products.id, 1))
    expect(await ids(emily, '/api/recently-viewed')).toEqual([])
  })
})

describe('deleting', () => {
  it('a product removes its rows everywhere', async () => {
    await call(emily, 'POST', '/api/cart/items', { productId: 9, quantity: 1 })
    await call(emily, 'PUT', '/api/favorites/9')
    await call(emily, 'PUT', '/api/recently-viewed/9')
    await getDb().delete(products).where(eq(products.id, 9))
    const db = getDb()
    expect(await db.select().from(cartItems).where(eq(cartItems.productId, 9))).toEqual([])
    expect(await db.select().from(favorites).where(eq(favorites.productId, 9))).toEqual([])
    expect(await db.select().from(recentlyViewed).where(eq(recentlyViewed.productId, 9))).toEqual(
      [],
    )
  })

  it('a user cascades to their cart, favorites and recently viewed', async () => {
    await call(avery, 'POST', '/api/cart/items', { productId: 1, quantity: 1 })
    await call(avery, 'PUT', '/api/favorites/1')
    await call(avery, 'PUT', '/api/recently-viewed/1')
    await getDb().delete(user).where(eq(user.id, 'user-16'))
    const db = getDb()
    expect(await db.select().from(cartItems).where(eq(cartItems.userId, 'user-16'))).toEqual([])
    expect(await db.select().from(favorites).where(eq(favorites.userId, 'user-16'))).toEqual([])
    expect(
      await db.select().from(recentlyViewed).where(eq(recentlyViewed.userId, 'user-16')),
    ).toEqual([])
  })
})
