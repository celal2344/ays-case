import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { root } from '../src/root'
import { signIn, useSeededDatabase } from './helpers/test-db'

const request = (path: string, init?: RequestInit) => root.request(path, init)

let close: () => Promise<void>

beforeAll(async () => {
  ;({ close } = await useSeededDatabase())
})
afterAll(async () => {
  await close()
})

describe('sign-in and session', () => {
  it('signs the demo admin in by username and sets a session cookie', async () => {
    const { res, cookie } = await signIn(request, 'emilys', 'emilyspass')
    expect(res.status).toBe(200)
    expect(cookie).toContain('session_token')
    expect(res.headers.getSetCookie().join(';').toLowerCase()).toContain('httponly')

    const session = await request('/api/auth/get-session', { headers: { cookie } })
    const body = (await session.json()) as { user: { username: string; role: string } }
    expect(body.user).toMatchObject({ username: 'emilys', role: 'admin' })
  })

  it('signs the demo user in with the user role', async () => {
    const { res, cookie } = await signIn(request, 'averyp', 'averyppass')
    expect(res.status).toBe(200)
    const session = await request('/api/auth/get-session', { headers: { cookie } })
    expect(((await session.json()) as { user: { role: string } }).user.role).toBe('user')
  })

  it('rejects a wrong password', async () => {
    const { res, cookie } = await signIn(request, 'emilys', 'not-the-password')
    expect(res.status).toBe(401)
    expect(cookie).toBe('')
  })

  it('does not let seeded users without a password sign in', async () => {
    const { res } = await signIn(request, 'michaelw', 'michaelwpass')
    expect(res.status).toBe(401)
  })

  it('has no session without a cookie', async () => {
    const session = await request('/api/auth/get-session')
    expect(await session.json()).toBeNull()
  })

  it('does not allow self sign-up', async () => {
    const res = await request('/api/auth/sign-up/email', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://localhost:5173' },
      body: JSON.stringify({
        email: 'new@example.com',
        password: 'password-12345',
        name: 'New User',
        firstName: 'New',
        lastName: 'User',
      }),
    })
    expect(res.status).toBeGreaterThanOrEqual(400)
  })
})

describe('GET /api/users (admin only)', () => {
  it('answers 401 without a session', async () => {
    const res = await request('/api/users')
    expect(res.status).toBe(401)
    expect(await res.json()).toMatchObject({ code: 'unauthorized' })
  })

  it('answers 403 for a regular user', async () => {
    const { cookie } = await signIn(request, 'averyp', 'averyppass')
    const res = await request('/api/users', { headers: { cookie } })
    expect(res.status).toBe(403)
    expect(await res.json()).toMatchObject({ code: 'forbidden' })
  })

  it('lists every user for an admin, without secrets', async () => {
    const { cookie } = await signIn(request, 'emilys', 'emilyspass')
    const res = await request('/api/users', { headers: { cookie } })
    expect(res.status).toBe(200)
    const { data } = (await res.json()) as { data: Record<string, unknown>[] }
    expect(data).toHaveLength(208)
    expect(Object.keys(data[0] ?? {}).sort()).toEqual([
      'email',
      'firstName',
      'id',
      'image',
      'lastName',
      'role',
      'username',
    ])
    expect(data.filter((u) => u.role === 'admin')).toHaveLength(5)
    expect(data.filter((u) => u.role === 'moderator')).toHaveLength(10)
  })

  it('stops working after sign-out', async () => {
    const { cookie } = await signIn(request, 'emilys', 'emilyspass')
    await request('/api/auth/sign-out', {
      method: 'POST',
      headers: { cookie, origin: 'http://localhost:5173', 'content-type': 'application/json' },
      body: '{}',
    })
    const res = await request('/api/users', { headers: { cookie } })
    expect(res.status).toBe(401)
  })
})
