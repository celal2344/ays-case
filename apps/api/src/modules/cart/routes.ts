import {
  addCartItemBodySchema,
  cartItemResponseSchema,
  cartResponseSchema,
  setCartQuantityBodySchema,
} from '@ays/validators'
import { Hono } from 'hono'
import { describeRoute, resolver, validator } from 'hono-openapi'

import { requireAuth, type AuthEnv } from '../../middlewares/auth'
import { errorResponse } from '../../utils/openapi'
import { productIdParam, validationHook } from '../../utils/validation'
import * as service from './service'

const json = (description: string, schema: Parameters<typeof resolver>[0]) => ({
  description,
  content: { 'application/json': { schema: resolver(schema) } },
})

const NOT_FOUND = { code: 'not_found', message: 'Product not found' } as const
const OUT_OF_STOCK = { code: 'out_of_stock', message: 'This product is out of stock' } as const

// Every route is scoped to the signed-in user (`c.var.user`); no user id is ever read from the request.
export const cartRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  .get(
    '/',
    describeRoute({
      tags: ['cart'],
      summary: 'My cart, newest line first',
      responses: {
        200: json('Cart lines', cartResponseSchema),
        401: errorResponse('Not signed in'),
      },
    }),
    async (c) => c.json({ data: await service.getCart(c.var.user.id) }, 200),
  )
  .post(
    '/items',
    describeRoute({
      tags: ['cart'],
      summary: 'Add to the cart; adds to an existing line, capped at stock',
      responses: {
        200: json('The resulting line', cartItemResponseSchema),
        401: errorResponse('Not signed in'),
        404: errorResponse('Unknown or deleted product'),
        409: errorResponse('Out of stock'),
        422: errorResponse('Invalid body'),
      },
    }),
    validator('json', addCartItemBodySchema, validationHook),
    async (c) => {
      const { productId, quantity } = c.req.valid('json')
      const result = await service.addItem(c.var.user.id, productId, quantity)
      if (result.ok) return c.json({ data: result.item }, 200)
      return result.reason === 'not_found' ? c.json(NOT_FOUND, 404) : c.json(OUT_OF_STOCK, 409)
    },
  )
  .put(
    '/items/:productId',
    describeRoute({
      tags: ['cart'],
      summary: 'Set a line quantity, clamped to 1..stock',
      responses: {
        200: json('The resulting line', cartItemResponseSchema),
        401: errorResponse('Not signed in'),
        404: errorResponse('Unknown or deleted product'),
        409: errorResponse('Out of stock'),
        422: errorResponse('Invalid body or id'),
      },
    }),
    validator('param', productIdParam, validationHook),
    validator('json', setCartQuantityBodySchema, validationHook),
    async (c) => {
      const { productId } = c.req.valid('param')
      const result = await service.setQuantity(
        c.var.user.id,
        productId,
        c.req.valid('json').quantity,
      )
      if (result.ok) return c.json({ data: result.item }, 200)
      return result.reason === 'not_found' ? c.json(NOT_FOUND, 404) : c.json(OUT_OF_STOCK, 409)
    },
  )
  .delete(
    '/items/:productId',
    describeRoute({
      tags: ['cart'],
      summary: 'Remove a line (idempotent)',
      responses: {
        204: { description: 'Removed, or it was not there' },
        401: errorResponse('Not signed in'),
        422: errorResponse('Invalid id'),
      },
    }),
    validator('param', productIdParam, validationHook),
    async (c) => {
      await service.removeItem(c.var.user.id, c.req.valid('param').productId)
      return c.body(null, 204)
    },
  )
  .delete(
    '/',
    describeRoute({
      tags: ['cart'],
      summary: 'Empty the cart',
      responses: { 204: { description: 'Emptied' }, 401: errorResponse('Not signed in') },
    }),
    async (c) => {
      await service.clear(c.var.user.id)
      return c.body(null, 204)
    },
  )
