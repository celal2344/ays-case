import { http, HttpResponse } from 'msw'

import type { User } from '@/features/auth/schemas'

import { fixtureCategories, fixtureDetail, fixtureProducts } from '../fixtures/products'

const BASE = 'https://dummyjson.com'

export const fixtureUsers: Record<string, User & { password: string }> = {
  emilys: {
    id: 1,
    username: 'emilys',
    password: 'emilyspass',
    email: 'emily.johnson@x.dummyjson.com',
    firstName: 'Emily',
    lastName: 'Johnson',
    image: 'https://dummyjson.com/icon/emilys/128',
    role: 'admin',
  },
  averyp: {
    id: 16,
    username: 'averyp',
    password: 'averyppass',
    email: 'avery.perez@x.dummyjson.com',
    firstName: 'Avery',
    lastName: 'Perez',
    image: 'https://dummyjson.com/icon/averyp/128',
    role: 'user',
  },
}

export function toPublicUser(user: User & { password: string }): User {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    image: user.image,
    role: user.role,
  }
}

// Fake tokens carry the user id: `access-<id>` / `refresh-<id>`. `access-<id>-expired` is a dead token.
export function userFromAuthHeader(header: string | null) {
  const match = /^Bearer access-(\d+)$/.exec(header ?? '')
  return Object.values(fixtureUsers).find((u) => u.id === Number(match?.[1]))
}

export const authHandlers = [
  http.post(`${BASE}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { username: string; password: string }
    const user = fixtureUsers[body.username]
    if (!user || user.password !== body.password) {
      return HttpResponse.json({ message: 'Invalid credentials' }, { status: 400 })
    }
    // login responses carry the basic user fields but no role
    return HttpResponse.json({
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      image: user.image,
      accessToken: `access-${user.id}`,
      refreshToken: `refresh-${user.id}`,
    })
  }),
  http.get(`${BASE}/auth/me`, ({ request }) => {
    const user = userFromAuthHeader(request.headers.get('Authorization'))
    if (!user) return HttpResponse.json({ message: 'Token Expired!' }, { status: 401 })
    return HttpResponse.json(toPublicUser(user))
  }),
  http.post(`${BASE}/auth/refresh`, async ({ request }) => {
    const body = (await request.json()) as { refreshToken: string }
    const id = /^refresh-(\d+)$/.exec(body.refreshToken)?.[1]
    if (!id) return HttpResponse.json({ message: 'Invalid refresh token' }, { status: 401 })
    return HttpResponse.json({ accessToken: `access-${id}`, refreshToken: `refresh-${id}` })
  }),
]

export const productHandlers = [
  http.get(`${BASE}/products/categories`, () => HttpResponse.json(fixtureCategories)),
  http.get(`${BASE}/products/:id`, ({ params }) => {
    const detail = fixtureDetail(Number(params.id))
    return detail
      ? HttpResponse.json(detail)
      : HttpResponse.json(
          { message: `Product with id '${String(params.id)}' not found` },
          { status: 404 },
        )
  }),
  http.get(`${BASE}/products`, () =>
    HttpResponse.json({
      products: fixtureProducts,
      total: fixtureProducts.length,
      skip: 0,
      limit: 0,
    }),
  ),
]

export const handlers = [...authHandlers, ...productHandlers]
