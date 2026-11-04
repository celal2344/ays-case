import { http, HttpResponse } from 'msw'

import type { Shipping } from '@ays/validators'

import type { User } from '@/features/auth/schemas'

import { fixtureUserList } from '../fixtures/users'
import { fixtureCategories, fixtureDetail, fixtureProducts } from '../fixtures/products'
import { FakeShopping } from '../fixtures/shopping'

const BASE = 'http://localhost/api'

export const fixtureUsers: Record<string, User & { password: string }> = {
  emilys: { ...fixtureUserList[0]!, password: 'emilyspass' },
  averyp: { ...fixtureUserList[15]!, password: 'averyppass' },
}

export function toPublicUser(user: User & { password: string }): User {
  const { password, ...rest } = user
  void password
  return rest
}

/**
 * The mocked server's idea of who is signed in. The real server keeps this in a cookie; Node's
 * fetch has no cookie jar, so tests share it here (reset before every test in `setup.ts`).
 */
export const serverSession: { userId: string | null } = { userId: null }

const sessionUser = () => fixtureUserList.find((u) => u.id === serverSession.userId)

const sessionBody = (user: User) => ({
  session: { id: `session-${user.id}`, userId: user.id, token: 'token' },
  user: { ...user, name: `${user.firstName} ${user.lastName}`, emailVerified: true },
})

export const authHandlers = [
  http.post(`${BASE}/auth/sign-in/username`, async ({ request }) => {
    const body = (await request.json()) as { username: string; password: string }
    const account = fixtureUsers[body.username]
    if (!account || account.password !== body.password) {
      return HttpResponse.json(
        { code: 'INVALID_USERNAME_OR_PASSWORD', message: 'Invalid username or password' },
        { status: 401 },
      )
    }
    serverSession.userId = account.id
    return HttpResponse.json({ redirect: false, token: 'token', user: toPublicUser(account) })
  }),
  http.get(`${BASE}/auth/get-session`, () => {
    const user = sessionUser()
    return HttpResponse.json(user ? sessionBody(user) : null)
  }),
  http.post(`${BASE}/auth/sign-out`, () => {
    serverSession.userId = null
    return HttpResponse.json({ success: true })
  }),
]

export const productHandlers = [
  http.get(`${BASE}/categories`, () => HttpResponse.json({ data: fixtureCategories })),
  http.get(`${BASE}/products/:id`, ({ params }) => {
    const detail = fixtureDetail(Number(params.id))
    return detail
      ? HttpResponse.json({ data: shopping.withReviews(detail) })
      : HttpResponse.json({ code: 'not_found', message: 'Product not found' }, { status: 404 })
  }),
  http.get(`${BASE}/products`, () =>
    HttpResponse.json({ data: fixtureProducts.map((p) => shopping.withStock(p)) }),
  ),
]

export const userHandlers = [
  http.get(`${BASE}/users`, () => {
    const user = sessionUser()
    if (!user) {
      return HttpResponse.json({ code: 'unauthorized', message: 'Sign in first' }, { status: 401 })
    }
    if (user.role !== 'admin') {
      return HttpResponse.json({ code: 'forbidden', message: 'Admins only' }, { status: 403 })
    }
    return HttpResponse.json({ data: fixtureUserList })
  }),
]

/** The mocked server's cart, favorites and recently viewed (reset before every test in `setup.ts`). */
export const shopping = new FakeShopping()

type Reply = { status: number; body?: unknown }
const reply = ({ status, body }: Reply) =>
  body === undefined ? new HttpResponse(null, { status }) : HttpResponse.json(body, { status })
const needSession = <T>(run: (userId: string) => T) => {
  const user = sessionUser()
  return user
    ? run(user.id)
    : HttpResponse.json({ code: 'unauthorized', message: 'Sign in required' }, { status: 401 })
}

export const shoppingHandlers = [
  http.get(`${BASE}/cart`, () => needSession((id) => reply(shopping.getCart(id)))),
  http.post(`${BASE}/cart/items`, async ({ request }) => {
    const body = (await request.json()) as { productId: number; quantity: number }
    return needSession((id) => reply(shopping.addToCart(id, body.productId, body.quantity)))
  }),
  http.put(`${BASE}/cart/items/:productId`, async ({ params, request }) => {
    const body = (await request.json()) as { quantity: number }
    return needSession((id) =>
      reply(shopping.setCartQuantity(id, Number(params.productId), body.quantity)),
    )
  }),
  http.delete(`${BASE}/cart/items/:productId`, ({ params }) =>
    needSession((id) => reply(shopping.removeFromCart(id, Number(params.productId)))),
  ),
  http.delete(`${BASE}/cart`, () => needSession((id) => reply(shopping.clearCart(id)))),
  http.get(`${BASE}/favorites`, () => needSession((id) => reply(shopping.getFavorites(id)))),
  http.put(`${BASE}/favorites/:productId`, ({ params }) =>
    needSession((id) => reply(shopping.addFavorite(id, Number(params.productId)))),
  ),
  http.delete(`${BASE}/favorites/:productId`, ({ params }) =>
    needSession((id) => reply(shopping.removeFavorite(id, Number(params.productId)))),
  ),
  http.get(`${BASE}/recently-viewed`, () => needSession((id) => reply(shopping.getViewed(id)))),
  http.put(`${BASE}/recently-viewed/:productId`, ({ params }) =>
    needSession((id) => reply(shopping.recordView(id, Number(params.productId)))),
  ),
  http.delete(`${BASE}/recently-viewed`, () =>
    needSession((id) => reply(shopping.clearViewed(id))),
  ),
]

export const orderHandlers = [
  http.post(`${BASE}/orders`, async ({ request }) => {
    const body = (await request.json()) as { shipping: Shipping }
    return needSession((id) => reply(shopping.placeOrder(id, body.shipping)))
  }),
  http.get(`${BASE}/orders`, () => needSession((id) => reply(shopping.getOrders(id)))),
  http.get(`${BASE}/orders/:id`, ({ params }) =>
    needSession((id) => reply(shopping.getOrder(id, String(params.id)))),
  ),
]

export const reviewHandlers = [
  http.post(`${BASE}/products/:id/reviews`, async ({ params, request }) => {
    const body = (await request.json()) as { rating: number; comment: string }
    return needSession((id) => reply(shopping.createReview(id, Number(params.id), body)))
  }),
  http.patch(`${BASE}/reviews/:id`, async ({ params, request }) => {
    const body = (await request.json()) as { rating?: number; comment?: string }
    return needSession((id) => reply(shopping.patchReview(id, Number(params.id), body)))
  }),
  http.delete(`${BASE}/reviews/:id`, ({ params }) =>
    needSession((id) =>
      reply(shopping.deleteReview(id, sessionUser()?.role === 'admin', Number(params.id))),
    ),
  ),
]

export const handlers = [
  ...authHandlers,
  ...productHandlers,
  ...userHandlers,
  ...shoppingHandlers,
  ...orderHandlers,
  ...reviewHandlers,
]
