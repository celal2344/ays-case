import { HttpResponse, http as mswHttp } from 'msw'
import { describe, expect, it } from 'vitest'

import { useAuthStore } from '@/features/auth/store'
import { server } from '@/test/msw/server'

import { http } from '../http'
import { AppError } from '../http-error'

describe('http client', () => {
  it('sends the bearer token', async () => {
    let header: string | null = null
    server.use(
      mswHttp.get('https://dummyjson.com/ping', ({ request }) => {
        header = request.headers.get('Authorization')
        return HttpResponse.json({ ok: true })
      }),
    )
    useAuthStore.setState({ accessToken: 'access-1', refreshToken: 'refresh-1' })
    await http.get('/ping')
    expect(header).toBe('Bearer access-1')
  })

  it('refreshes once on 401 and retries; parallel 401s share a single refresh', async () => {
    let refreshCalls = 0
    server.use(
      mswHttp.get('https://dummyjson.com/secret', ({ request }) =>
        request.headers.get('Authorization') === 'Bearer access-1'
          ? HttpResponse.json({ ok: true })
          : HttpResponse.json({ message: 'Token Expired!' }, { status: 401 }),
      ),
      mswHttp.post('https://dummyjson.com/auth/refresh', () => {
        refreshCalls += 1
        return HttpResponse.json({ accessToken: 'access-1', refreshToken: 'refresh-1' })
      }),
    )
    useAuthStore.setState({ accessToken: 'access-1-expired', refreshToken: 'refresh-1' })
    const results = await Promise.all([
      http.get('/secret'),
      http.get('/secret'),
      http.get('/secret'),
    ])
    expect(results.map((r) => r.data)).toEqual([{ ok: true }, { ok: true }, { ok: true }])
    expect(refreshCalls).toBe(1)
    expect(useAuthStore.getState().accessToken).toBe('access-1')
  })

  it('logs out and throws when the refresh fails', async () => {
    server.use(
      mswHttp.get('https://dummyjson.com/secret', () =>
        HttpResponse.json({ message: 'Token Expired!' }, { status: 401 }),
      ),
    )
    useAuthStore.setState({
      accessToken: 'access-1-expired',
      refreshToken: 'garbage',
      status: 'authenticated',
    })
    await expect(http.get('/secret')).rejects.toMatchObject({ kind: 'unauthorized' })
    expect(useAuthStore.getState().status).toBe('anonymous')
  })

  it('maps failures to AppError kinds', async () => {
    server.use(
      mswHttp.get('https://dummyjson.com/missing', () =>
        HttpResponse.json({ message: 'Product not found' }, { status: 404 }),
      ),
      mswHttp.get('https://dummyjson.com/boom', () => HttpResponse.json({}, { status: 500 })),
      mswHttp.get('https://dummyjson.com/offline', () => HttpResponse.error()),
    )
    const missing = await http.get('/missing').catch((e: unknown) => e)
    expect(missing).toBeInstanceOf(AppError)
    expect(missing).toMatchObject({ kind: 'not_found', message: 'Product not found', status: 404 })
    await expect(http.get('/boom')).rejects.toMatchObject({ kind: 'server' })
    await expect(http.get('/offline')).rejects.toMatchObject({ kind: 'network' })
  })
})
