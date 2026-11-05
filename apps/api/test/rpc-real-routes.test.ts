/**
 * The RPC canary on the real routes: `hc<AppType>` with base URL /api must infer the request
 * input and a typed response per status for the catalog endpoints. Enforced by `tsc --noEmit`.
 */
import type { CartItem, Category, Order, Product, ProductDetail, Review } from '@ays/validators'
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
    // the 404 is thrown as an AppError by the repository, so it is documented in OpenAPI and
    // typed as `ApiError` by the web, not inferred by hc
    expectTypeOf<Extract<Res, { status: 404 }>>().toEqualTypeOf<never>()
  })

  it('types GET /categories', () => {
    type Res = Awaited<ReturnType<typeof client.categories.$get>>
    expectTypeOf<Res>().toEqualTypeOf<ClientResponse<{ data: Category[] }, 200, 'json'>>()
  })

  it('exposes the admin-only users list', () => {
    expectTypeOf(client.users.$get).toBeFunction()
  })

  it('types the cart: body in, per-status responses out', () => {
    type Add = typeof client.cart.items.$post
    expectTypeOf<Parameters<Add>[0]>().toMatchTypeOf<{
      json: { productId: number; quantity: number }
    }>()
    type Res = Awaited<ReturnType<Add>>
    expectTypeOf<Extract<Res, { status: 200 }>>().toEqualTypeOf<
      ClientResponse<{ data: CartItem }, 200, 'json'>
    >()
    expectTypeOf<Extract<Res, { status: 409 }>>().toEqualTypeOf<
      ClientResponse<
        { readonly code: 'out_of_stock'; readonly message: 'This product is out of stock' },
        409,
        'json'
      >
    >()
    type List = Awaited<ReturnType<typeof client.cart.$get>>
    expectTypeOf<Extract<List, { status: 200 }>>().toEqualTypeOf<
      ClientResponse<{ data: CartItem[] }, 200, 'json'>
    >()
  })

  it('types favorites and recently viewed as id lists with a product id param', () => {
    type Favorites = Awaited<ReturnType<typeof client.favorites.$get>>
    expectTypeOf<Extract<Favorites, { status: 200 }>>().toEqualTypeOf<
      ClientResponse<{ data: number[] }, 200, 'json'>
    >()
    type Put = (typeof client.favorites)[':productId']['$put']
    expectTypeOf<Parameters<Put>[0]>().toEqualTypeOf<{ param: { productId: string } }>()
    expectTypeOf(client['recently-viewed'].$get).toBeFunction()
  })

  it('types checkout: only shipping goes in; order, shortage and empty cart come out', () => {
    type Post = typeof client.orders.$post
    expectTypeOf<Parameters<Post>[0]>().toMatchTypeOf<{ json: { shipping: object } }>()
    type Res = Awaited<ReturnType<Post>>
    expectTypeOf<Extract<Res, { status: 201 }>>().toEqualTypeOf<
      ClientResponse<{ data: Order }, 201, 'json'>
    >()
    expectTypeOf<Extract<Res, { status: 409 }>['json']>().toBeFunction()
    expectTypeOf<Extract<Res, { status: 422 }>['json']>().toBeFunction()
    type Get = (typeof client.orders)[':id']['$get']
    expectTypeOf<Parameters<Get>[0]>().toEqualTypeOf<{ param: { id: string } }>()
  })

  it('types reviews: create, edit and delete', () => {
    type Create = (typeof client.products)[':id']['reviews']['$post']
    expectTypeOf<Extract<Awaited<ReturnType<Create>>, { status: 201 }>>().toEqualTypeOf<
      ClientResponse<{ data: Review }, 201, 'json'>
    >()
    type Patch = (typeof client.reviews)[':id']['$patch']
    expectTypeOf<Extract<Awaited<ReturnType<Patch>>, { status: 200 }>>().toEqualTypeOf<
      ClientResponse<{ data: Review }, 200, 'json'>
    >()
    expectTypeOf(client.reviews[':id'].$delete).toBeFunction()
  })

  it('types the admin writes: bodies in, products out', () => {
    type Create = typeof client.products.$post
    expectTypeOf<Parameters<Create>[0]>().toMatchTypeOf<{
      json: { sku: string; priceCents: number }
    }>()
    expectTypeOf<Extract<Awaited<ReturnType<Create>>, { status: 201 }>>().toEqualTypeOf<
      ClientResponse<{ data: ProductDetail }, 201, 'json'>
    >()
    type Patch = (typeof client.products)[':id']['$patch']
    expectTypeOf<Parameters<Patch>[0]>().toMatchTypeOf<{ param: { id: string } }>()
    expectTypeOf(client.products[':id'].restore.$post).toBeFunction()
    expectTypeOf(client.admin.products.$get).toBeFunction()
    expectTypeOf(client.admin.categories[':id'].$delete).toBeFunction()
    expectTypeOf(client.users[':id'].$patch).toBeFunction()
  })
})
