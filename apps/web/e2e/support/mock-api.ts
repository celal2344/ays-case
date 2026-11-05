import type { Page, Route } from '@playwright/test'

import { FakeAdmin, isFailure, LOOKUP_TABLES, type Failure } from '../../src/test/fixtures/admin'
import { FakeShopping } from '../../src/test/fixtures/shopping'

const accounts = {
  emilys: { id: 'user-1', password: 'emilyspass' },
  averyp: { id: 'user-16', password: 'averyppass' },
} as const

const PIXEL =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

/** Serves the API from the shared test fixtures, so the e2e specs never touch a real backend. */
export async function mockApi(page: Page) {
  let signedInAs: string | null = null
  const shopping = new FakeShopping()
  const admin = new FakeAdmin()

  await page.route(/^https:\/\/(cdn\.)?dummyjson\.com\/.+/, (route) =>
    route.fulfill({ contentType: 'image/png', body: Buffer.from(PIXEL, 'base64') }),
  )

  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const { pathname } = new URL(request.url())
    const method = request.method()
    const user = admin.users.find((u) => u.id === signedInAs)

    if (pathname === '/api/auth/sign-in/username' && method === 'POST') {
      const body = request.postDataJSON() as { username: string; password: string }
      const account = accounts[body.username as keyof typeof accounts]
      if (!account || account.password !== body.password) {
        return json(
          route,
          { code: 'INVALID_USERNAME_OR_PASSWORD', message: 'Invalid username or password' },
          401,
        )
      }
      signedInAs = account.id
      return json(route, { redirect: false, token: 'token' })
    }
    if (pathname === '/api/auth/sign-in/email' && method === 'POST') {
      const body = request.postDataJSON() as { email: string; password: string }
      const found = admin.users.find((u) => u.email === body.email.toLowerCase())
      const account = found && Object.values(accounts).find((a) => a.id === found.id)
      if (!account || account.password !== body.password) {
        return json(
          route,
          { code: 'INVALID_EMAIL_OR_PASSWORD', message: 'Invalid email or password' },
          401,
        )
      }
      signedInAs = account.id
      return json(route, { redirect: false, token: 'token' })
    }
    if (pathname === '/api/auth/sign-up/email' && method === 'POST') {
      const body = request.postDataJSON() as {
        email: string
        password: string
        firstName: string
        lastName: string
        username: string
      }
      const username = body.username.toLowerCase()
      if (admin.users.some((u) => u.username?.toLowerCase() === username)) {
        return json(
          route,
          { code: 'USERNAME_IS_ALREADY_TAKEN', message: 'Username is already taken.' },
          400,
        )
      }
      if (admin.users.some((u) => u.email.toLowerCase() === body.email.toLowerCase())) {
        return json(
          route,
          { code: 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL', message: 'User already exists.' },
          422,
        )
      }
      const created = admin.createUser({
        username,
        email: body.email.toLowerCase(),
        firstName: body.firstName,
        lastName: body.lastName,
        role: 'user',
        password: body.password,
      })
      if (isFailure(created))
        return json(route, { code: created.code, message: created.message }, created.status)
      signedInAs = created.id
      return json(route, { token: 'token' })
    }
    if (pathname === '/api/auth/get-session') {
      return json(
        route,
        user
          ? {
              session: { id: `session-${user.id}`, userId: user.id, token: 'token' },
              user: { ...user, name: `${user.firstName} ${user.lastName}`, emailVerified: true },
            }
          : null,
      )
    }
    if (pathname === '/api/auth/sign-out') {
      signedInAs = null
      return json(route, { success: true })
    }

    const body = () => request.postDataJSON() as never
    const failure = (f: Failure) => json(route, { code: f.code, message: f.message }, f.status)
    const needAdmin = () => {
      if (!user) return json(route, { code: 'unauthorized', message: 'Sign in first' }, 401)
      if (user.role !== 'admin')
        return json(route, { code: 'forbidden', message: 'Admins only' }, 403)
      return null
    }
    const result = (value: object | null, status = 200) =>
      value === null
        ? route.fulfill({ status: 204 })
        : isFailure(value)
          ? failure(value)
          : json(route, { data: value }, status)

    if (pathname === '/api/categories') return json(route, { data: admin.lookups.categories })

    const lookup = new RegExp(`^/api/admin/(${LOOKUP_TABLES.join('|')})(?:/([0-9]+))?$`).exec(
      pathname,
    )
    if (lookup) {
      const denied = needAdmin()
      if (denied) return denied
      const table = lookup[1] as (typeof LOOKUP_TABLES)[number]
      const id = Number(lookup[2])
      if (method === 'GET') return json(route, { data: admin.lookups[table] })
      if (method === 'POST') return result(admin.createLookup(table, body()), 201)
      if (method === 'PATCH') return result(admin.updateLookup(table, id, body()))
      if (method === 'DELETE') return result(admin.deleteLookup(table, id))
    }
    if (pathname === '/api/admin/products') {
      return needAdmin() ?? json(route, { data: admin.adminProducts() })
    }

    if (pathname === '/api/products') {
      if (method === 'POST') return needAdmin() ?? result(admin.createProduct(body()), 201)
      return json(route, { data: admin.liveProducts().map((p) => shopping.withStock(p)) })
    }
    const restore = /^\/api\/products\/(\d+)\/restore$/.exec(pathname)?.[1]
    if (restore) return needAdmin() ?? result(admin.restoreProduct(Number(restore)))
    const productId = /^\/api\/products\/(\d+)$/.exec(pathname)?.[1]
    if (productId && method === 'PATCH') {
      return needAdmin() ?? result(admin.updateProduct(Number(productId), body()))
    }
    if (productId && method === 'DELETE') {
      return needAdmin() ?? result(admin.deleteProduct(Number(productId)))
    }
    if (productId) {
      const detail = admin.liveProduct(Number(productId))
      return detail
        ? json(route, { data: shopping.withReviews(detail) })
        : json(route, { code: 'not_found', message: 'Product not found' }, 404)
    }

    if (pathname === '/api/users') {
      const denied = needAdmin()
      if (denied) return denied
      return method === 'POST'
        ? result(admin.createUser(body()), 201)
        : json(route, { data: admin.users })
    }
    const userId = /^\/api\/users\/([^/]+)$/.exec(pathname)?.[1]
    if (userId) {
      const denied = needAdmin()
      if (denied) return denied
      return method === 'DELETE'
        ? result(admin.deleteUser(userId, signedInAs))
        : result(admin.updateUser(userId, body(), signedInAs))
    }

    const productParam = Number(/\/(\d+)$/.exec(pathname)?.[1])
    const productIdOf = (path: string) => Number(/\/products\/(\d+)\//.exec(path)?.[1])
    const reply = (r: { status: number; body?: unknown }) =>
      r.body === undefined ? route.fulfill({ status: r.status }) : json(route, r.body, r.status)
    if (/^\/api\/(cart|favorites|recently-viewed)/.test(pathname)) {
      if (!user) return json(route, { code: 'unauthorized', message: 'Sign in required' }, 401)
      const body = (method === 'GET' || method === 'DELETE' ? null : request.postDataJSON()) as {
        productId?: number
        quantity?: number
      } | null
      const id = user.id
      if (pathname === '/api/cart') {
        return reply(method === 'DELETE' ? shopping.clearCart(id) : shopping.getCart(id))
      }
      if (pathname === '/api/cart/items') {
        return reply(shopping.addToCart(id, body?.productId ?? 0, body?.quantity ?? 1))
      }
      if (pathname.startsWith('/api/cart/items/')) {
        return reply(
          method === 'DELETE'
            ? shopping.removeFromCart(id, productParam)
            : shopping.setCartQuantity(id, productParam, body?.quantity ?? 1),
        )
      }
      if (pathname === '/api/favorites') return reply(shopping.getFavorites(id))
      if (pathname.startsWith('/api/favorites/')) {
        return reply(
          method === 'DELETE'
            ? shopping.removeFavorite(id, productParam)
            : shopping.addFavorite(id, productParam),
        )
      }
      if (pathname === '/api/recently-viewed') {
        return reply(method === 'DELETE' ? shopping.clearViewed(id) : shopping.getViewed(id))
      }
      return reply(shopping.recordView(id, productParam))
    }

    // checkout and reviews: the same rules as the API, from the shared in-memory copy
    if (pathname.startsWith('/api/orders') || /\/reviews(\/|$)/.test(pathname)) {
      if (!user) return json(route, { code: 'unauthorized', message: 'Sign in required' }, 401)
      const payload = method === 'GET' || method === 'DELETE' ? null : request.postDataJSON()
      const last = pathname.split('/').pop() ?? ''
      if (pathname === '/api/orders' && method === 'POST') {
        return reply(shopping.placeOrder(user.id, (payload as { shipping: never }).shipping))
      }
      if (pathname === '/api/orders') return reply(shopping.getOrders(user.id))
      if (pathname.startsWith('/api/orders/')) return reply(shopping.getOrder(user.id, last))
      if (pathname.startsWith('/api/products/') && method === 'POST') {
        return reply(shopping.createReview(user.id, productIdOf(pathname), payload as never))
      }
      if (pathname.startsWith('/api/reviews/') && method === 'PATCH') {
        return reply(shopping.patchReview(user.id, Number(last), payload as never))
      }
      if (pathname.startsWith('/api/reviews/') && method === 'DELETE') {
        return reply(shopping.deleteReview(user.id, user.role === 'admin', Number(last)))
      }
    }

    return json(route, { code: 'not_found', message: `Unmocked ${method} ${pathname}` }, 404)
  })
}
