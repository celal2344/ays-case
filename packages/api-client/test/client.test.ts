import { describe, expect, expectTypeOf, it } from 'vitest'

import { hcWithType } from '../src/index'

describe('hcWithType', () => {
  it('builds /health requests against the base URL', async () => {
    let requested = ''
    const client = hcWithType('http://api.test', {
      fetch: async (input: RequestInfo | URL) => {
        requested = String(input instanceof Request ? input.url : input)
        return Response.json({ data: { status: 'ok' } })
      },
    })
    const res = await client.health.$get()
    expect(requested).toBe('http://api.test/health')
    expect(await res.json()).toEqual({ data: { status: 'ok' } })
  })

  it('infers the /health response', async () => {
    type Client = ReturnType<typeof hcWithType>
    type Res = Awaited<ReturnType<Client['health']['$get']>>
    expectTypeOf<Awaited<ReturnType<Res['json']>>>().toEqualTypeOf<{ data: { status: 'ok' } }>()
  })
})
