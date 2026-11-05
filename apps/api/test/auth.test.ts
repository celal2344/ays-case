import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { getDb } from '../src/db/client'
import { session, user } from '../src/db/schema'
import { root } from '../src/root'
import { freshIp, signIn, signInWithEmail, signUp, useSeededDatabase } from './helpers/test-db'

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
    expect(data).toHaveLength(30)
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
    expect(data.filter((u) => u.role === 'user')).toHaveLength(25)
  })

  it('stops working after sign-out: the browser drops both session cookies', async () => {
    const { cookie } = await signIn(request, 'emilys', 'emilyspass')
    const out = await request('/api/auth/sign-out', {
      method: 'POST',
      headers: { cookie, origin: 'http://localhost:5173', 'content-type': 'application/json' },
      body: '{}',
    })
    const cleared = out.headers.getSetCookie().filter((c) => c.includes('Max-Age=0'))
    expect(cleared.some((c) => c.includes('session_token='))).toBe(true)
    expect(cleared.some((c) => c.includes('session_data='))).toBe(true)
    const res = await request('/api/users')
    expect(res.status).toBe(401)
  })
})

describe('session cookie cache (5 minutes)', () => {
  it('answers get-session from the signed cookie without reading the database', async () => {
    const { cookie } = await signIn(request, 'averyp', 'averyppass')
    expect(cookie).toContain('session_data')
    // remove the session row: only the cookie cache can still know this user
    await getDb().delete(session)
    const res = await request('/api/auth/get-session', { headers: { cookie } })
    expect(((await res.json()) as { user: { username: string } }).user.username).toBe('averyp')
  })

  it('without the cache cookie the removed session is gone', async () => {
    const { cookie } = await signIn(request, 'averyp', 'averyppass')
    await getDb().delete(session)
    const tokenOnly = cookie
      .split('; ')
      .filter((c) => !c.includes('session_data'))
      .join('; ')
    const res = await request('/api/auth/get-session', { headers: { cookie: tokenOnly } })
    expect(await res.json()).toBeNull()
  })
})

const newcomer = {
  email: 'newcomer@example.com',
  password: 'a-long-password-1',
  name: 'New Comer',
  firstName: 'New',
  lastName: 'Comer',
  username: 'NewComer',
}

describe('registration', () => {
  it('creates a user, signs them in and keeps the username as typed for display', async () => {
    const { res, cookie } = await signUp(request, newcomer)
    expect(res.status).toBe(200)
    expect(cookie).toContain('session_token')
    const session = await request('/api/auth/get-session', { headers: { cookie } })
    const body = (await session.json()) as {
      user: { role: string; username: string; displayUsername: string; email: string }
    }
    expect(body.user).toMatchObject({
      role: 'user',
      username: 'newcomer',
      displayUsername: 'NewComer',
      email: 'newcomer@example.com',
    })
  })

  it('never lets a client choose its role', async () => {
    const { res } = await signUp(request, {
      ...newcomer,
      email: 'sneaky@example.com',
      username: 'sneaky',
      role: 'admin',
    })
    const row = (
      await getDb()
        .select({ role: user.role })
        .from(user)
        .where(eq(user.email, 'sneaky@example.com'))
    )[0]
    // either refused, or created as a plain user: never an admin
    expect(res.status === 200 ? row?.role : 'user').toBe('user')
    expect(row?.role === 'admin').toBe(false)
  })

  it('rejects a duplicate username and a duplicate email', async () => {
    const sameName = await signUp(request, { ...newcomer, email: 'other@example.com' })
    expect(sameName.res.status).toBeGreaterThanOrEqual(400)
    expect(await sameName.res.text()).toMatch(/USERNAME_IS_ALREADY_TAKEN|username/i)
    const sameEmail = await signUp(request, { ...newcomer, username: 'another_one' })
    expect(sameEmail.res.status).toBeGreaterThanOrEqual(400)
    expect(await sameEmail.res.text()).toMatch(/USER_ALREADY_EXISTS|already/i)
  })

  it('lets the new user sign in with the username and with the email', async () => {
    expect((await signIn(request, 'newcomer', newcomer.password)).res.status).toBe(200)
    expect((await signIn(request, 'NewComer', newcomer.password)).res.status).toBe(200)
    expect(
      (await signInWithEmail(request, 'newcomer@example.com', newcomer.password)).res.status,
    ).toBe(200)
    expect(
      (await signInWithEmail(request, 'newcomer@example.com', 'wrong-password')).res.status,
    ).toBe(401)
  })

  it('answers 429 on the 4th sign-up from one address within ten minutes', async () => {
    const ip = freshIp()
    for (let i = 0; i < 3; i++) {
      const { res } = await signUp(
        request,
        { ...newcomer, email: `limit${i}@example.com`, username: `limit_${i}` },
        ip,
      )
      expect(res.status).toBe(200)
    }
    const { res } = await signUp(
      request,
      { ...newcomer, email: 'limit3@example.com', username: 'limit_3' },
      ip,
    )
    expect(res.status).toBe(429)
  })

  it('rate limits sign-in by email like sign-in by username', async () => {
    const ip = freshIp()
    const attempt = () =>
      request('/api/auth/sign-in/email', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: 'http://localhost:5173',
          'x-forwarded-for': ip,
        },
        body: JSON.stringify({ email: 'nobody@example.com', password: 'wrong-password' }),
      })
    for (let i = 0; i < 5; i++) expect((await attempt()).status).toBe(401)
    expect((await attempt()).status).toBe(429)
  })
})

describe('roles', () => {
  it('the database refuses any role but admin and user', async () => {
    await expect(
      getDb().update(user).set({ role: 'boss' }).where(eq(user.username, 'averyp')),
    ).rejects.toThrow()
  })

  it('a demoted admin is refused on the very next admin request, with the cookie cache on', async () => {
    await signUp(request, {
      ...newcomer,
      email: 'boss@example.com',
      username: 'boss',
    })
    const { cookie } = await signIn(request, 'boss', newcomer.password)
    await getDb().update(user).set({ role: 'admin' }).where(eq(user.username, 'boss'))
    // the signed session cookie still says "user" for up to 5 minutes; the guard reads the live role
    expect((await request('/api/users', { headers: { cookie } })).status).toBe(200)
    await getDb().update(user).set({ role: 'user' }).where(eq(user.username, 'boss'))
    expect((await request('/api/users', { headers: { cookie } })).status).toBe(403)
  })
})
