import type { ProductDetail } from '@ays/validators'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { getDb } from '../src/db/client'
import { cartItems, orders, products, reviews } from '../src/db/schema'
import { root } from '../src/root'
import { signIn, useSeededDatabase } from './helpers/test-db'

const request = (path: string, init?: RequestInit) => root.request(path, init)

let close: () => Promise<void>
let emily: string // admin
let avery: string // user

const shipping = {
  fullName: 'Avery Perez',
  address: '1 Main Street',
  city: 'Izmir',
  phone: '5551112233',
}
const PRODUCT = 1
const good = { rating: 4, comment: 'Really happy with this purchase.' }

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
  await db.delete(orders)
  await db.delete(cartItems)
  await db.delete(reviews).where(eq(reviews.productId, PRODUCT))
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

const detail = async () =>
  ((await (await request(`/api/products/${PRODUCT}`)).json()) as { data: ProductDetail }).data
const create = (cookie: string, body: unknown = good) =>
  call(cookie, 'POST', `/api/products/${PRODUCT}/reviews`, body)
const idOf = async (res: Response) => ((await res.json()) as { data: { id: number } }).data.id

describe('POST /products/:id/reviews', () => {
  it('needs a session, a real product and a valid body', async () => {
    expect((await call(undefined, 'POST', `/api/products/${PRODUCT}/reviews`, good)).status).toBe(
      401,
    )
    expect((await call(avery, 'POST', '/api/products/99999/reviews', good)).status).toBe(404)
    for (const bad of [
      { rating: 0, comment: good.comment },
      { rating: 6, comment: good.comment },
      { rating: 3.5, comment: good.comment },
      { rating: 3, comment: 'too short' },
      { rating: 3, comment: 'x'.repeat(501) },
    ]) {
      const res = await create(avery, bad)
      expect(res.status).toBe(422)
      expect(await res.json()).toMatchObject({ code: 'validation_error' })
    }
  })

  it('creates the review and the rating, count and histogram change at once', async () => {
    expect(await detail()).toMatchObject({ rating: null, reviewCount: 0 })
    const res = await create(avery, { rating: 4, comment: good.comment })
    expect(res.status).toBe(201)
    expect(await res.json()).toMatchObject({
      data: { rating: 4, comment: good.comment, author: { id: 'user-16' }, verifiedBuyer: false },
    })
    expect(await detail()).toMatchObject({
      rating: 4,
      reviewCount: 1,
      ratingHistogram: { '1': 0, '2': 0, '3': 0, '4': 1, '5': 0 },
    })
    await create(emily, { rating: 1, comment: 'Not what I expected at all.' })
    expect(await detail()).toMatchObject({
      rating: 2.5,
      reviewCount: 2,
      ratingHistogram: { '1': 1, '4': 1 },
    })
  })

  it('answers 409 review_exists for a second review by the same user', async () => {
    await create(avery)
    const again = await create(avery, { rating: 5, comment: 'Trying to review it twice.' })
    expect(again.status).toBe(409)
    expect(await again.json()).toMatchObject({ code: 'review_exists' })
    expect((await detail()).reviewCount).toBe(1)
  })

  it('does not review a deleted product', async () => {
    await getDb().update(products).set({ deletedAt: new Date() }).where(eq(products.id, PRODUCT))
    expect((await create(avery)).status).toBe(404)
  })
})

describe('PATCH /reviews/:id', () => {
  it('edits my own review and the rating follows', async () => {
    const id = await idOf(await create(avery))
    const res = await call(avery, 'PATCH', `/api/reviews/${id}`, { rating: 2 })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ data: { id, rating: 2, comment: good.comment } })
    expect(await detail()).toMatchObject({ rating: 2, reviewCount: 1 })
    const both = await call(avery, 'PATCH', `/api/reviews/${id}`, {
      rating: 5,
      comment: 'Changed my mind, it is great.',
    })
    expect(await both.json()).toMatchObject({
      data: { rating: 5, comment: 'Changed my mind, it is great.' },
    })
  })

  it("is forbidden on someone else's review, even for an admin, and 404 when missing", async () => {
    const id = await idOf(await create(avery))
    expect((await call(emily, 'PATCH', `/api/reviews/${id}`, { rating: 1 })).status).toBe(403)
    expect((await call(avery, 'PATCH', '/api/reviews/999999', { rating: 1 })).status).toBe(404)
    expect((await call(undefined, 'PATCH', `/api/reviews/${id}`, { rating: 1 })).status).toBe(401)
    expect((await detail()).rating).toBe(4)
  })

  it('rejects an empty or invalid change with 422', async () => {
    const id = await idOf(await create(avery))
    expect((await call(avery, 'PATCH', `/api/reviews/${id}`, {})).status).toBe(422)
    expect((await call(avery, 'PATCH', `/api/reviews/${id}`, { rating: 9 })).status).toBe(422)
  })
})

describe('DELETE /reviews/:id', () => {
  it('deletes my own review and the rating drops back', async () => {
    const id = await idOf(await create(avery))
    expect((await call(avery, 'DELETE', `/api/reviews/${id}`)).status).toBe(204)
    expect(await detail()).toMatchObject({ rating: null, reviewCount: 0 })
    expect((await call(avery, 'DELETE', `/api/reviews/${id}`)).status).toBe(404)
    // and the user can review again
    expect((await create(avery)).status).toBe(201)
  })

  it("forbids deleting someone else's review, but an admin can delete any", async () => {
    const id = await idOf(await create(avery))
    expect((await call(undefined, 'DELETE', `/api/reviews/${id}`)).status).toBe(401)
    const otherId = await idOf(
      await create(emily, { rating: 3, comment: 'An admin writing a review.' }),
    )
    expect((await call(avery, 'DELETE', `/api/reviews/${otherId}`)).status).toBe(403)
    expect((await detail()).reviewCount).toBe(2)
    expect((await call(emily, 'DELETE', `/api/reviews/${id}`)).status).toBe(204)
    expect((await detail()).reviewCount).toBe(1)
  })
})

describe('verifiedBuyer', () => {
  it('is true only for authors with an order for the product', async () => {
    await create(avery)
    await create(emily, { rating: 5, comment: 'Never bought it, just reviewing.' })
    await call(avery, 'POST', '/api/cart/items', { productId: PRODUCT, quantity: 1 })
    expect((await call(avery, 'POST', '/api/orders', { shipping })).status).toBe(201)

    const reviewsOf = (await detail()).reviews
    const byAuthor = new Map(reviewsOf.map((r) => [r.author.id, r.verifiedBuyer]))
    expect(byAuthor.get('user-16')).toBe(true)
    expect(byAuthor.get('user-1')).toBe(false)
    // an order for a different product does not make someone a verified buyer
    await call(emily, 'POST', '/api/cart/items', { productId: 2, quantity: 1 })
    await call(emily, 'POST', '/api/orders', { shipping })
    expect(
      new Map((await detail()).reviews.map((r) => [r.author.id, r.verifiedBuyer])).get('user-1'),
    ).toBe(false)
  })
})
