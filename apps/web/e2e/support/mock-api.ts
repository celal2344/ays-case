import type { Page, Route } from '@playwright/test'

import { fixtureCategories, fixtureDetail, fixtureProducts } from '../../src/test/fixtures/products'
import { FakeShopping } from '../../src/test/fixtures/shopping'
import { fixtureUserList } from '../../src/test/fixtures/users'

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

  await page.route(/^https:\/\/(cdn\.)?dummyjson\.com\/.+/, (route) =>
    route.fulfill({ contentType: 'image/png', body: Buffer.from(PIXEL, 'base64') }),
  )

  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const { pathname } = new URL(request.url())
    const method = request.method()
    const user = fixtureUserList.find((u) => u.id === signedInAs)

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

    if (pathname === '/api/categories') return json(route, { data: fixtureCategories })
    if (pathname === '/api/products') {
      return json(route, { data: fixtureProducts })
    }
    const productId = /^\/api\/products\/(\d+)$/.exec(pathname)?.[1]
    if (productId) {
      const detail = fixtureDetail(Number(productId))
      return detail
        ? json(route, { data: detail })
        : json(route, { code: 'not_found', message: 'Product not found' }, 404)
    }

    if (pathname === '/api/users') {
      if (!user) return json(route, { code: 'unauthorized', message: 'Sign in first' }, 401)
      if (user.role !== 'admin')
        return json(route, { code: 'forbidden', message: 'Admins only' }, 403)
      return json(route, { data: fixtureUserList })
    }

    const productParam = Number(/\/(\d+)$/.exec(pathname)?.[1])
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

    return json(route, { code: 'not_found', message: `Unmocked ${method} ${pathname}` }, 404)
  })
}
