/**
 * RPC canary: `hc<AppType>` must infer the request input from `validator()` and one typed
 * response per status from `c.json(body, status)`, with hono-openapi in the chain. The type
 * assertions are enforced by `tsc --noEmit` (the `typecheck` task); the runtime part checks
 * that the same route also validates and documents itself.
 */
import { errorSchema } from '@ays/validators'
import { Hono } from 'hono'
import { hc, type ClientResponse } from 'hono/client'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { describeRoute, resolver, validator } from 'hono-openapi'
import { z } from 'zod'

import { validationHook } from '../src/utils/validation'

const bodySchema = z.object({ name: z.string().min(2), qty: z.number().int() })
const okSchema = z.object({ data: z.object({ id: z.number() }) })

export const sample = new Hono().post(
  '/items/:id',
  describeRoute({
    responses: {
      201: {
        description: 'created',
        content: { 'application/json': { schema: resolver(okSchema) } },
      },
      404: {
        description: 'missing',
        content: { 'application/json': { schema: resolver(errorSchema) } },
      },
    },
  }),
  validator('param', z.object({ id: z.string() }), validationHook),
  validator('json', bodySchema, validationHook),
  (c) => {
    const { id } = c.req.valid('param')
    if (id === '0') return c.json({ code: 'not_found', message: 'No such item' }, 404)
    return c.json({ data: { id: Number(id) } }, 201)
  },
)

type SampleApp = typeof sample

describe('hc<AppType> inference', () => {
  type Client = ReturnType<typeof hc<SampleApp>>
  type Post = Client['items'][':id']['$post']

  it('infers the request input from validator()', () => {
    expectTypeOf<Parameters<Post>[0]>().toEqualTypeOf<
      { param: { id: string } } & { json: { name: string; qty: number } }
    >()
  })

  it('infers one typed response per status', () => {
    type Res = Awaited<ReturnType<Post>>
    expectTypeOf<Res>().toEqualTypeOf<
      | ClientResponse<{ code: string; message: string }, 404, 'json'>
      | ClientResponse<{ data: { id: number } }, 201, 'json'>
    >()
  })
})

describe('sample route at runtime', () => {
  it('validates input and answers a list of field errors', async () => {
    const res = await sample.request('/items/1', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'a', qty: 1.5 }),
    })
    expect(res.status).toBe(422)
    const body = (await res.json()) as { code: string; errors: { field: string }[] }
    expect(body.code).toBe('validation_error')
    expect(body.errors.map((e) => e.field).sort()).toEqual(['name', 'qty'])
  })
})
