/**
 * The RPC canary on the real routes: `hc<AppType>` with base URL /api must infer the request
 * input and a typed response per status for the catalog endpoints. Enforced by `tsc --noEmit`.
 */
import type { Category, Product, ProductDetail } from '@ays/validators'
import { hc, type ClientResponse } from 'hono/client'
import { describe, expectTypeOf, it } from 'vitest'

import type { AppType } from '../src/app'

const client = hc<AppType>('/api')

describe('hc<AppType> on the real routes', () => {
  it('types GET /products', () => {
    type Res = Awaited<ReturnType<typeof client.products.$get>>
    expectTypeOf<Res>().toEqualTypeOf<ClientResponse<{ data: Product[] }, 200, 'json'>>()
  })

  it('infers the id param and per-status responses of GET /products/:id', () => {
    type Get = (typeof client.products)[':id']['$get']
    expectTypeOf<Parameters<Get>[0]>().toEqualTypeOf<{ param: { id: string } }>()
    type Res = Awaited<ReturnType<Get>>
    expectTypeOf<Extract<Res, { status: 200 }>>().toEqualTypeOf<
      ClientResponse<{ data: ProductDetail }, 200, 'json'>
    >()
    expectTypeOf<Extract<Res, { status: 404 }>>().toEqualTypeOf<
      ClientResponse<{ code: string; message: string }, 404, 'json'>
    >()
  })

  it('types GET /categories', () => {
    type Res = Awaited<ReturnType<typeof client.categories.$get>>
    expectTypeOf<Res>().toEqualTypeOf<ClientResponse<{ data: Category[] }, 200, 'json'>>()
  })

  it('exposes the admin-only users list', () => {
    expectTypeOf(client.users.$get).toBeFunction()
  })
})
