import type { Page, Route } from '@playwright/test'

import { fixtureCategories, fixtureDetail, fixtureProducts } from '../../src/test/fixtures/products'
import { fixtureUserList } from '../../src/test/fixtures/users'

const accounts = {
  emilys: { id: 1, password: 'emilyspass', role: 'admin' },
  averyp: { id: 16, password: 'averyppass', role: 'user' },
} as const

const PIXEL =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

/** Serves DummyJSON from the shared test fixtures, so the e2e specs never touch the network. */
export async function mockApi(page: Page) {
  await page.route(/^https:\/\/(cdn\.)?dummyjson\.com\/(?!auth|products|users|carts).+/, (route) =>
    route.fulfill({ contentType: 'image/png', body: Buffer.from(PIXEL, 'base64') }),
  )

  await page.route('https://dummyjson.com/**', async (route) => {
    const request = route.request()
    const { pathname } = new URL(request.url())
    const method = request.method()
    const body = request.postDataJSON() as Record<string, unknown> | null

    if (pathname === '/auth/login' && method === 'POST') {
      const username = String(body?.username)
      const account = accounts[username as keyof typeof accounts]
      if (!account || account.password !== body?.password) {
        return json(route, { message: 'Invalid credentials' }, 400)
      }
      const user = fixtureUserList.find((u) => u.id === account.id)!
      return json(route, {
        ...user,
        accessToken: `access-${account.id}`,
        refreshToken: `refresh-${account.id}`,
      })
    }
    if (pathname === '/auth/me') {
      const id = /^Bearer access-(\d+)$/.exec(request.headers().authorization ?? '')?.[1]
      const user = fixtureUserList.find((u) => u.id === Number(id))
      return user ? json(route, user) : json(route, { message: 'Token Expired!' }, 401)
    }
    if (pathname === '/auth/refresh') {
      const id = /^refresh-(\d+)$/.exec(String(body?.refreshToken))?.[1]
      return id
        ? json(route, { accessToken: `access-${id}`, refreshToken: `refresh-${id}` })
        : json(route, { message: 'Invalid refresh token' }, 401)
    }

    if (pathname === '/products/categories') return json(route, fixtureCategories)
    if (pathname === '/products/add') return json(route, { id: 195, ...body })
    if (pathname === '/products') {
      return json(route, {
        products: fixtureProducts,
        total: fixtureProducts.length,
        skip: 0,
        limit: 0,
      })
    }
    const productId = /^\/products\/(\d+)$/.exec(pathname)?.[1]
    if (productId) {
      const id = Number(productId)
      if (method === 'DELETE') {
        return json(route, { id, isDeleted: true, deletedOn: new Date().toISOString() })
      }
      if (method === 'PUT') return json(route, { id, ...body })
      const detail = fixtureDetail(id)
      return detail ? json(route, detail) : json(route, { message: 'Not found' }, 404)
    }

    if (pathname === '/users') {
      return json(route, {
        users: fixtureUserList,
        total: fixtureUserList.length,
        skip: 0,
        limit: 0,
      })
    }
    if (pathname === '/carts/add') {
      const products = (body?.products ?? []) as { id: number }[]
      return json(route, { id: 209, userId: body?.userId, products })
    }

    return json(route, { message: `Unmocked ${method} ${pathname}` }, 404)
  })
}
