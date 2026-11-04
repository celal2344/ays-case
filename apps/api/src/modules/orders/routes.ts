import {
  createOrderBodySchema,
  orderListResponseSchema,
  orderResponseSchema,
} from '@ays/validators'
import { Hono } from 'hono'
import { describeRoute, resolver, validator } from 'hono-openapi'
import { z } from 'zod'

import { requireAuth, type AuthEnv } from '../../middlewares/auth'
import { errorResponse } from '../../utils/openapi'
import { validationHook } from '../../utils/validation'
import * as service from './service'

const json = (description: string, schema: Parameters<typeof resolver>[0]) => ({
  description,
  content: { 'application/json': { schema: resolver(schema) } },
})

const orderParams = z.object({ id: z.uuid() })

// Every route is scoped to the signed-in user (`c.var.user`); another user's order is simply not found.
export const orderRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  .post(
    '/',
    describeRoute({
      tags: ['orders'],
      summary: 'Check out: create an order from my cart, atomically',
      description:
        'Takes only the shipping details. Items come from the server cart and prices from the ' +
        "server's catalog. In one transaction: stock is checked and taken, the order and its " +
        'frozen lines are stored, and the cart is emptied.',
      responses: {
        201: json('The order', orderResponseSchema),
        401: errorResponse('Not signed in'),
        409: errorResponse('`product_unavailable` or `insufficient_stock`; nothing was changed'),
        422: errorResponse('`cart_empty`, or invalid shipping details'),
      },
    }),
    validator('json', createOrderBodySchema, validationHook),
    async (c) => {
      const result = await service.placeOrder(c.var.user.id, c.req.valid('json').shipping)
      if (result.ok) return c.json({ data: result.order }, 201)
      if (result.code === 'cart_empty') {
        return c.json({ code: result.code, message: result.message }, 422)
      }
      return c.json({ code: result.code, message: result.message }, 409)
    },
  )
  .get(
    '/',
    describeRoute({
      tags: ['orders'],
      summary: 'My orders, newest first, with their lines',
      responses: {
        200: json('Orders', orderListResponseSchema),
        401: errorResponse('Not signed in'),
      },
    }),
    async (c) => c.json({ data: await service.listOrders(c.var.user.id) }, 200),
  )
  .get(
    '/:id',
    describeRoute({
      tags: ['orders'],
      summary: 'One of my orders',
      responses: {
        200: json('The order', orderResponseSchema),
        401: errorResponse('Not signed in'),
        404: errorResponse('No such order (or it is not mine)'),
        422: errorResponse('Invalid id'),
      },
    }),
    validator('param', orderParams, validationHook),
    async (c) => {
      const order = await service.getOrder(c.var.user.id, c.req.valid('param').id)
      if (!order) return c.json({ code: 'not_found', message: 'Order not found' }, 404)
      return c.json({ data: order }, 200)
    },
  )
