import type { Page, Route } from '@playwright/test'

import {
  fixtureProducts,
  fixtureWireCategories,
  fixtureWireDetail,
  toWireProduct,
} from '../../src/test/fixtures/products'
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

    if (pathname === '/api/categories') return json(route, { data: fixtureWireCategories })
    if (pathname === '/api/products') {
      return json(route, { data: fixtureProducts.map(toWireProduct) })
    }
    const productId = /^\/api\/products\/(\d+)$/.exec(pathname)?.[1]
    if (productId) {
      const detail = fixtureWireDetail(Number(productId))
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

    return json(route, { code: 'not_found', message: `Unmocked ${method} ${pathname}` }, 404)
  })
}
