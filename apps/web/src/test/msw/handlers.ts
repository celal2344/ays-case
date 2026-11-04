import { http, HttpResponse } from 'msw'

import type { User } from '@/features/auth/schemas'

import { fixtureUserList } from '../fixtures/users'
import { fixtureCategories, fixtureDetail, fixtureProducts } from '../fixtures/products'

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
      ? HttpResponse.json({ data: detail })
      : HttpResponse.json({ code: 'not_found', message: 'Product not found' }, { status: 404 })
  }),
  http.get(`${BASE}/products`, () => HttpResponse.json({ data: fixtureProducts })),
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

export const handlers = [...authHandlers, ...productHandlers, ...userHandlers]
