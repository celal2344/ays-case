import { HttpResponse, http } from 'msw'
import { describe, expect, it, vi } from 'vitest'

import { setSessionExpiredHandler } from '@/features/auth/store'
import { signInAs } from '@/test/auth'
import { server } from '@/test/msw/server'

import { api, call } from '../api'

describe('call (typed RPC wrapper)', () => {
  it('returns the typed body of a 200 answer', async () => {
    const body = await call(api.categories.$get())
    expect(body.data.map((c) => c.slug)).toEqual(['beauty', 'groceries', 'smartphones'])
  })

  it('maps an API error body to an AppError of the right kind', async () => {
    await expect(call(api.products[':id'].$get({ param: { id: '99999' } }))).rejects.toMatchObject({
      kind: 'not_found',
      status: 404,
      message: 'Product not found',
    })
  })

  it('maps a dropped connection to a network error', async () => {
    server.use(http.get('http://localhost/api/categories', () => HttpResponse.error()))
    await expect(call(api.categories.$get())).rejects.toMatchObject({ kind: 'network' })
  })

  it('ends a signed-in session when the API answers 401', async () => {
    const onExpired = vi.fn()
    setSessionExpiredHandler(onExpired)
    signInAs('emilys')
    server.use(
      http.get('http://localhost/api/categories', () =>
        HttpResponse.json({ code: 'unauthorized', message: 'Sign in first' }, { status: 401 }),
      ),
    )
    await expect(call(api.categories.$get())).rejects.toMatchObject({ kind: 'unauthorized' })
    expect(onExpired).toHaveBeenCalledTimes(1)
    setSessionExpiredHandler(null)
  })
})
