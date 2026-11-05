import { http, HttpResponse } from 'msw'

import type { ProductBody, ProductPatchBody, Shipping } from '@ays/validators'

import type { User } from '@/features/auth/schemas'

import { fixtureUserList } from '../fixtures/users'
import {
  FakeAdmin,
  isFailure,
  LOOKUP_TABLES,
  type Failure,
  type LookupRecord,
} from '../fixtures/admin'
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

const sessionUser = () => admin.users.find((u) => u.id === serverSession.userId)

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

/** The mocked server's admin side: products, lookups and users (reset before every test in `setup.ts`). */
export const admin = new FakeAdmin()

const asJson = (value: object, status = 200) => HttpResponse.json(value, { status })
const failure = (f: Failure) => asJson({ code: f.code, message: f.message }, f.status)

/** Runs `run` for a signed-in admin; anyone else gets the 401 or 403 the real API sends. */
const asAdmin = <T>(run: (actingId: string) => T) => {
  const user = sessionUser()
  if (!user) return asJson({ code: 'unauthorized', message: 'Sign in first' }, 401)
  if (user.role !== 'admin') return asJson({ code: 'forbidden', message: 'Admins only' }, 403)
  return run(user.id)
}

export const productHandlers = [
  http.get(`${BASE}/categories`, () => asJson({ data: admin.lookups.categories })),
  http.get(`${BASE}/products/:id`, ({ params }) => {
    const detail = admin.liveProduct(Number(params.id))
    return detail
      ? asJson({ data: shopping.withReviews(detail) })
      : asJson({ code: 'not_found', message: 'Product not found' }, 404)
  }),
  http.get(`${BASE}/products`, () =>
    asJson({ data: admin.liveProducts().map((p) => shopping.withStock(p)) }),
  ),
  http.post(`${BASE}/products`, async ({ request }) =>
    asAdmin(async () => {
      const result = admin.createProduct((await request.json()) as ProductBody)
      return isFailure(result) ? failure(result) : asJson({ data: result }, 201)
    }),
  ),
  http.patch(`${BASE}/products/:id`, async ({ params, request }) =>
    asAdmin(async () => {
      const result = admin.updateProduct(
        Number(params.id),
        (await request.json()) as ProductPatchBody,
      )
      return isFailure(result) ? failure(result) : asJson({ data: result })
    }),
  ),
  http.delete(`${BASE}/products/:id`, ({ params }) =>
    asAdmin(() => {
      const result = admin.deleteProduct(Number(params.id))
      return result ? failure(result) : new HttpResponse(null, { status: 204 })
    }),
  ),
  http.post(`${BASE}/products/:id/restore`, ({ params }) =>
    asAdmin(() => {
      const result = admin.restoreProduct(Number(params.id))
      return isFailure(result) ? failure(result) : asJson({ data: result })
    }),
  ),
  http.get(`${BASE}/admin/products`, () => asAdmin(() => asJson({ data: admin.adminProducts() }))),
]

const lookupHandlers = LOOKUP_TABLES.flatMap((table) => [
  http.get(`${BASE}/admin/${table}`, () =>
    asAdmin(() =>
      asJson({
        data:
          table === 'tags'
            ? // like the real API: each tag comes with how many live products use it
              admin.lookups.tags.map((tag) => ({
                ...tag,
                productCount: admin
                  .liveProducts()
                  .filter((product) => product.tags.some((t) => t.slug === tag.slug)).length,
              }))
            : admin.lookups[table],
      }),
    ),
  ),
  http.post(`${BASE}/admin/${table}`, async ({ request }) =>
    asAdmin(async () => {
      const result = admin.createLookup(table, (await request.json()) as Omit<LookupRecord, 'id'>)
      return isFailure(result) ? failure(result) : asJson({ data: result }, 201)
    }),
  ),
  http.patch(`${BASE}/admin/${table}/:id`, async ({ params, request }) =>
    asAdmin(async () => {
      const result = admin.updateLookup(
        table,
        Number(params.id),
        (await request.json()) as Omit<LookupRecord, 'id'>,
      )
      return isFailure(result) ? failure(result) : asJson({ data: result })
    }),
  ),
  http.delete(`${BASE}/admin/${table}/:id`, ({ params }) =>
    asAdmin(() => {
      const result = admin.deleteLookup(table, Number(params.id))
      return result ? failure(result) : new HttpResponse(null, { status: 204 })
    }),
  ),
])

export const userHandlers = [
  http.get(`${BASE}/users`, () => asAdmin(() => asJson({ data: admin.users }))),
  http.post(`${BASE}/users`, async ({ request }) =>
    asAdmin(async () => {
      const result = admin.createUser(
        (await request.json()) as Parameters<FakeAdmin['createUser']>[0],
      )
      return isFailure(result) ? failure(result) : asJson({ data: result }, 201)
    }),
  ),
  http.patch(`${BASE}/users/:id`, async ({ params, request }) =>
    asAdmin(async (actingId) => {
      const result = admin.updateUser(
        String(params.id),
        (await request.json()) as Partial<User>,
        actingId,
      )
      return isFailure(result) ? failure(result) : asJson({ data: result })
    }),
  ),
  http.delete(`${BASE}/users/:id`, ({ params }) =>
    asAdmin((actingId) => {
      const result = admin.deleteUser(String(params.id), actingId)
      return result ? failure(result) : new HttpResponse(null, { status: 204 })
    }),
  ),
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
  ...lookupHandlers,
  ...userHandlers,
  ...shoppingHandlers,
  ...orderHandlers,
  ...reviewHandlers,
]
