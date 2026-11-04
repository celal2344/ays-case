import { describe, expect, it } from 'vitest'

import { root } from '../src/root'

describe('app mounted under /api', () => {
  it('answers /api/health in the data envelope', async () => {
    const res = await root.request('/api/health')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ data: { status: 'ok' } })
  })

  it('does not serve the prefix-free paths', async () => {
    const res = await root.request('/health')
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ code: 'not_found', message: 'Route GET /health not found' })
  })

  it('sets secure headers and no CORS headers (same origin only)', async () => {
    const res = await root.request('/api/health', { headers: { origin: 'http://localhost:5173' } })
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('answers unknown routes under /api with the error shape', async () => {
    const res = await root.request('/api/nope')
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({
      code: 'not_found',
      message: 'Route GET /api/nope not found',
    })
  })

  it('serves an OpenAPI spec with the /api server and the routes', async () => {
    const res = await root.request('/api/openapi.json')
    expect(res.status).toBe(200)
    const spec = (await res.json()) as {
      openapi: string
      servers: { url: string }[]
      paths: Record<string, unknown>
    }
    expect(spec.openapi).toBe('3.1.0')
    expect(spec.servers).toEqual([{ url: '/api' }])
    expect(Object.keys(spec.paths)).toEqual(expect.arrayContaining(['/health']))
  })

  it('renders the Scalar docs page pointing at the prefixed spec', async () => {
    const res = await root.request('/api/docs')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/html')
    expect(await res.text()).toContain('/api/openapi.json')
  })
})
