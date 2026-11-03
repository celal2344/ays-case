import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'

import { fixtureUsers, toPublicUser } from '@/test/msw/handlers'
import { server } from '@/test/msw/server'

import { selectIsAdmin, useAuthStore } from '../store'

const state = () => useAuthStore.getState()

describe('auth store', () => {
  it('login stores tokens, loads the role from /auth/me and persists tokens + user only', async () => {
    const user = await state().login('emilys', 'emilyspass')
    expect(user.role).toBe('admin')
    expect(state().status).toBe('authenticated')
    expect(selectIsAdmin(state())).toBe(true)

    const saved = JSON.parse(localStorage.getItem('ays-case:v1:auth') ?? '{}')
    expect(Object.keys(saved.state).sort()).toEqual(['accessToken', 'refreshToken', 'user'])
  })

  it('login rejects invalid credentials and leaves the user anonymous', async () => {
    await expect(state().login('emilys', 'wrong')).rejects.toMatchObject({
      kind: 'validation',
      message: 'Invalid credentials',
    })
    expect(state().accessToken).toBeNull()
  })

  it('logout clears tokens and user', async () => {
    await state().login('averyp', 'averyppass')
    state().logout()
    expect(state()).toMatchObject({
      accessToken: null,
      refreshToken: null,
      user: null,
      status: 'anonymous',
    })
  })

  it('bootstrap without stored tokens becomes anonymous without a request', async () => {
    await state().bootstrap()
    expect(state().status).toBe('anonymous')
  })

  it('bootstrap restores the session from persisted tokens', async () => {
    useAuthStore.setState({ accessToken: 'access-1', refreshToken: 'refresh-1' })
    await state().bootstrap()
    expect(state().status).toBe('authenticated')
    expect(state().user).toEqual(toPublicUser(fixtureUsers.emilys!))
  })

  it('bootstrap is idempotent: concurrent callers share one /auth/me request', async () => {
    let calls = 0
    server.use(
      http.get('https://dummyjson.com/auth/me', () => {
        calls += 1
        return HttpResponse.json(toPublicUser(fixtureUsers.averyp!))
      }),
    )
    useAuthStore.setState({ accessToken: 'access-16', refreshToken: 'refresh-16' })
    await Promise.all([state().bootstrap(), state().bootstrap(), state().bootstrap()])
    expect(calls).toBe(1)
  })

  it('bootstrap recovers an expired access token through refresh', async () => {
    useAuthStore.setState({ accessToken: 'access-1-expired', refreshToken: 'refresh-1' })
    await state().bootstrap()
    expect(state().status).toBe('authenticated')
    expect(state().accessToken).toBe('access-1')
  })

  it('bootstrap logs out when refresh fails too', async () => {
    useAuthStore.setState({ accessToken: 'access-1-expired', refreshToken: 'garbage' })
    await state().bootstrap()
    expect(state().status).toBe('anonymous')
    expect(state().accessToken).toBeNull()
  })
})
