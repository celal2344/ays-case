import { salePriceCents, type Order } from '@ays/validators'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { getDb } from '../src/db/client'
import { cartItems, orderLines, orders, products } from '../src/db/schema'
import { root } from '../src/root'
import { signIn, useSeededDatabase } from './helpers/test-db'

const request = (path: string, init?: RequestInit) => root.request(path, init)

let close: () => Promise<void>
let emily: string
let avery: string

const shipping = {
  fullName: 'Avery Perez',
  address: '1 Main Street',
  city: 'Izmir',
  phone: '+90 555 111 22 33',
}

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
  await db.delete(orders)
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

const addToCart = (cookie: string, productId: number, quantity: number) =>
  call(cookie, 'POST', '/api/cart/items', { productId, quantity })
const checkout = (cookie: string | undefined, body: unknown = { shipping }) =>
  call(cookie, 'POST', '/api/orders', body)
const stockOf = async (id: number) =>
  (await getDb().select({ stock: products.stock }).from(products).where(eq(products.id, id)))[0]
    ?.stock
const cartLines = async (cookie: string) =>
  ((await (await call(cookie, 'GET', '/api/cart')).json()) as { data: unknown[] }).data

describe('orders need a session', () => {
  it.each([
    ['POST', '/api/orders'],
    ['GET', '/api/orders'],
    ['GET', '/api/orders/3f6c1a2e-5b1d-4e0a-9c55-0b8f2d6f3a11'],
  ])('%s %s answers 401', async (method, path) => {
    const res = await call(undefined, method, path, method === 'POST' ? { shipping } : undefined)
    expect(res.status).toBe(401)
  })
})

describe('POST /orders', () => {
  it('creates the order from the server cart: lines, server prices, new stock, empty cart', async () => {
    await addToCart(avery, 1, 2)
    await addToCart(avery, 2, 1)
    const [p1] = await getDb().select().from(products).where(eq(products.id, 1))
    const [p2] = await getDb().select().from(products).where(eq(products.id, 2))
    const unit1 = salePriceCents({
      priceCents: p1!.priceCents,
      discountPercentage: Number(p1!.discountPercentage),
    })
    const unit2 = salePriceCents({
      priceCents: p2!.priceCents,
      discountPercentage: Number(p2!.discountPercentage),
    })

    const res = await checkout(avery)
    expect(res.status).toBe(201)
    const { data } = (await res.json()) as { data: Order }
    expect(data.userId).toBe('user-16')
    expect(data.shipping).toEqual(shipping)
    expect(data.lines.map((l) => [l.productId, l.quantity, l.listCents, l.unitCents])).toEqual([
      [1, 2, p1!.priceCents, unit1],
      [2, 1, p2!.priceCents, unit2],
    ])
    const subtotal = p1!.priceCents * 2 + p2!.priceCents
    const total = unit1 * 2 + unit2
    expect(data.totals).toEqual({
      subtotalCents: subtotal,
      discountCents: subtotal - total,
      totalCents: total,
    })
    expect(data.lines[0]?.title).toBe(p1!.title)
    expect(data.lines[0]?.thumbnail).toMatch(/^https:/)

    expect(await stockOf(1)).toBe(48)
    expect(await stockOf(2)).toBe(49)
    expect(await cartLines(avery)).toEqual([])
  })

  it('freezes the lines: a later price change does not rewrite the order', async () => {
    await addToCart(avery, 1, 1)
    const { data } = (await (await checkout(avery)).json()) as { data: Order }
    const before = data.lines[0]!.unitCents
    await getDb()
      .update(products)
      .set({ priceCents: 999999, title: 'Renamed' })
      .where(eq(products.id, 1))
    const again = (await (await call(avery, 'GET', `/api/orders/${data.id}`)).json()) as {
      data: Order
    }
    expect(again.data.lines[0]).toMatchObject({ unitCents: before })
    expect(again.data.lines[0]?.title).not.toBe('Renamed')
    expect(again.data.totals).toEqual(data.totals)
  })

  it('ignores totals and items the client tries to send', async () => {
    await addToCart(avery, 1, 1)
    const res = await checkout(avery, {
      shipping,
      totals: { totalCents: 1 },
      items: [{ productId: 3, quantity: 9 }],
      userId: 'user-1',
    })
    const { data } = (await res.json()) as { data: Order }
    expect(data.userId).toBe('user-16')
    expect(data.lines.map((l) => l.productId)).toEqual([1])
    expect(data.totals.totalCents).toBeGreaterThan(1)
  })

  it('a shortage rolls everything back: stock, cart and orders stay as they were', async () => {
    await addToCart(avery, 1, 2)
    await addToCart(avery, 2, 5)
    await getDb().update(products).set({ stock: 3 }).where(eq(products.id, 2))
    const res = await checkout(avery)
    expect(res.status).toBe(409)
    const body = (await res.json()) as { code: string; message: string }
    expect(body.code).toBe('insufficient_stock')
    const [p2] = await getDb().select().from(products).where(eq(products.id, 2))
    expect(body.message).toContain(p2!.title)

    expect(await stockOf(1)).toBe(50) // the line that was fine is untouched too
    expect(await stockOf(2)).toBe(3)
    expect(await cartLines(avery)).toHaveLength(2)
    expect(await getDb().select().from(orders)).toEqual([])
    expect(await getDb().select().from(orderLines)).toEqual([])
  })

  it('refuses an empty cart with 422 cart_empty', async () => {
    const res = await checkout(avery)
    expect(res.status).toBe(422)
    expect(await res.json()).toMatchObject({ code: 'cart_empty' })
  })

  it('refuses a product that was deleted since it was added, with 409 product_unavailable', async () => {
    await addToCart(avery, 1, 1)
    await getDb().update(products).set({ deletedAt: new Date() }).where(eq(products.id, 1))
    const res = await checkout(avery)
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ code: 'product_unavailable' })
    expect(await getDb().select().from(cartItems)).toHaveLength(1) // not cleared
  })

  it('validates the shipping details with the shared rules', async () => {
    await addToCart(avery, 1, 1)
    const res = await checkout(avery, {
      shipping: { fullName: 'A', address: 'x', city: '', phone: 'abc' },
    })
    expect(res.status).toBe(422)
    const body = (await res.json()) as { errors: { field: string; message: string }[] }
    expect(body.errors.map((e) => e.field).sort()).toEqual([
      'shipping.address',
      'shipping.city',
      'shipping.fullName',
      'shipping.phone',
    ])
    expect(await cartLines(avery)).toHaveLength(1)
  })

  it('stock can never go negative: the database CHECK still holds', async () => {
    await expect(
      getDb().update(products).set({ stock: -1 }).where(eq(products.id, 1)),
    ).rejects.toThrow()
  })

  it('takes the last unit once: a second checkout of the same stock is refused', async () => {
    // PGlite runs one connection, so a truly concurrent checkout cannot be exercised here. What
    // makes it safe on Postgres is the row lock (SELECT ... FOR UPDATE, in id order) plus the
    // guarded update (stock >= quantity) and the products_stock_check CHECK; this shows the
    // sequential outcome: the second buyer sees the stock the first one left.
    await getDb().update(products).set({ stock: 1 }).where(eq(products.id, 1))
    await addToCart(avery, 1, 1)
    await addToCart(emily, 1, 1)
    expect((await checkout(avery)).status).toBe(201)
    const second = await checkout(emily)
    expect(second.status).toBe(409)
    expect(await second.json()).toMatchObject({ code: 'insufficient_stock' })
    expect(await stockOf(1)).toBe(0)
  })
})

describe('GET /orders', () => {
  it("lists my orders newest first, with lines, and never anyone else's", async () => {
    await addToCart(avery, 1, 1)
    const first = (await (await checkout(avery)).json()) as { data: Order }
    await addToCart(avery, 2, 1)
    const second = (await (await checkout(avery)).json()) as { data: Order }
    await addToCart(emily, 3, 1)
    await checkout(emily)

    const mine = (await (await call(avery, 'GET', '/api/orders')).json()) as { data: Order[] }
    expect(mine.data.map((o) => o.id)).toEqual([second.data.id, first.data.id])
    expect(mine.data.every((o) => o.userId === 'user-16' && o.lines.length === 1)).toBe(true)
    const hers = (await (await call(emily, 'GET', '/api/orders')).json()) as { data: Order[] }
    expect(hers.data).toHaveLength(1)
  })

  it("answers 404 for someone else's order id and 422 for a malformed one", async () => {
    await addToCart(avery, 1, 1)
    const { data } = (await (await checkout(avery)).json()) as { data: Order }
    expect((await call(emily, 'GET', `/api/orders/${data.id}`)).status).toBe(404)
    expect((await call(avery, 'GET', `/api/orders/${data.id}`)).status).toBe(200)
    expect((await call(avery, 'GET', '/api/orders/not-a-uuid')).status).toBe(422)
    expect(
      (await call(avery, 'GET', '/api/orders/3f6c1a2e-5b1d-4e0a-9c55-0b8f2d6f3a11')).status,
    ).toBe(404)
  })
})

describe('deleting', () => {
  it('a hard-deleted product keeps the order line, with a null product id', async () => {
    await addToCart(avery, 9, 1)
    const { data } = (await (await checkout(avery)).json()) as { data: Order }
    await getDb().delete(products).where(eq(products.id, 9))
    const again = (await (await call(avery, 'GET', `/api/orders/${data.id}`)).json()) as {
      data: Order
    }
    expect(again.data.lines[0]).toMatchObject({ productId: null, title: data.lines[0]?.title })
  })
})
