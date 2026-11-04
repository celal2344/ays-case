import { HttpResponse, http } from 'msw'
import { describe, expect, it, vi } from 'vitest'

import { fixtureUsers, serverSession, toPublicUser } from '@/test/msw/handlers'
import { server } from '@/test/msw/server'

import { selectIsAdmin, setSessionExpiredHandler, useAuthStore } from '../store'

const state = () => useAuthStore.getState()

describe('auth store', () => {
  it('login signs in by username, reads the role from the session and persists nothing', async () => {
    const user = await state().login('emilys', 'emilyspass')
    expect(user.role).toBe('admin')
    expect(state().status).toBe('authenticated')
    expect(selectIsAdmin(state())).toBe(true)
    expect(localStorage.getItem('ays-case:v1:auth')).toBeNull()
  })

  it('login rejects invalid credentials and leaves the user anonymous', async () => {
    await expect(state().login('emilys', 'wrong')).rejects.toMatchObject({
      kind: 'validation',
      message: 'Invalid username or password',
    })
    expect(state().user).toBeNull()
  })

  it('logout clears the user and ends the server session', async () => {
    await state().login('averyp', 'averyppass')
    state().logout()
    expect(state()).toMatchObject({ user: null, status: 'anonymous' })
    await vi.waitFor(() => expect(serverSession.userId).toBeNull())
  })

  it('bootstrap without a session becomes anonymous', async () => {
    await state().bootstrap()
    expect(state().status).toBe('anonymous')
  })

  it('bootstrap restores the session from the cookie', async () => {
    serverSession.userId = fixtureUsers.emilys!.id
    await state().bootstrap()
    expect(state().status).toBe('authenticated')
    expect(state().user).toEqual(toPublicUser(fixtureUsers.emilys!))
  })

  it('bootstrap is idempotent: concurrent callers share one session request', async () => {
    let calls = 0
    server.use(
      http.get('http://localhost/api/auth/get-session', () => {
        calls += 1
        return HttpResponse.json(null)
      }),
    )
    await Promise.all([state().bootstrap(), state().bootstrap(), state().bootstrap()])
    expect(calls).toBe(1)
  })

  it('expire ends a signed-in session and runs the registered handler once', async () => {
    const handler = vi.fn()
    setSessionExpiredHandler(handler)
    await state().login('averyp', 'averyppass')
    state().expire()
    state().expire()
    expect(state()).toMatchObject({ user: null, status: 'anonymous' })
    expect(handler).toHaveBeenCalledTimes(1)
    setSessionExpiredHandler(null)
  })
})
