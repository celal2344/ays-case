import { describe, expect, it } from 'vitest'

import { app } from '../src/app'

describe('app', () => {
  it('answers /health in the data envelope', async () => {
    const res = await app.request('/health')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ data: { status: 'ok' } })
  })

  it('sets secure headers and CORS for the web origin', async () => {
    const res = await app.request('/health', { headers: { origin: 'http://localhost:5173' } })
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:5173')
  })

  it('answers unknown routes with the error shape', async () => {
    const res = await app.request('/nope')
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ code: 'not_found', message: 'Route GET /nope not found' })
  })

  it('serves an OpenAPI spec that lists the routes', async () => {
    const res = await app.request('/openapi.json')
    expect(res.status).toBe(200)
    const spec = (await res.json()) as { openapi: string; paths: Record<string, unknown> }
    expect(spec.openapi).toBe('3.1.0')
    expect(Object.keys(spec.paths)).toEqual(expect.arrayContaining(['/health']))
  })

  it('renders the Scalar docs page', async () => {
    const res = await app.request('/docs')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/html')
  })
})
