import { reviewBodySchema, reviewResponseSchema, reviewUpdateBodySchema } from '@ays/validators'
import { Hono } from 'hono'
import { describeRoute, resolver, validator } from 'hono-openapi'
import { z } from 'zod'

import { getDb } from '../../db/client'
import { requireAuth, type AuthEnv } from '../../middlewares/auth'
import { errorResponse } from '../../utils/openapi'
import { validationHook } from '../../utils/validation'
import * as repository from './repository'

const json = (description: string, schema: Parameters<typeof resolver>[0]) => ({
  description,
  content: { 'application/json': { schema: resolver(schema) } },
})

const productParams = z.object({ id: z.coerce.number().int().positive() })
const reviewParams = z.object({ id: z.coerce.number().int().positive() })

const NOT_FOUND = { code: 'not_found', message: 'Review not found' } as const
const FORBIDDEN = { code: 'forbidden', message: 'This is not your review' } as const

/** `POST /products/:id/reviews`, mounted next to the public catalog routes. */
export const productReviewRoutes = new Hono<AuthEnv>().post(
  '/:id/reviews',
  describeRoute({
    tags: ['reviews'],
    summary: 'Review a product (one review per user and product)',
    responses: {
      201: json('The new review', reviewResponseSchema),
      401: errorResponse('Not signed in'),
      404: errorResponse('Unknown or deleted product'),
      409: errorResponse('`review_exists`: you already reviewed this product'),
      422: errorResponse('Invalid rating or comment'),
    },
  }),
  requireAuth,
  validator('param', productParams, validationHook),
  validator('json', reviewBodySchema, validationHook),
  async (c) => {
    const db = getDb()
    const { id: productId } = c.req.valid('param')
    const userId = c.var.user.id
    if (!(await repository.productExists(db, productId))) {
      return c.json({ code: 'not_found', message: 'Product not found' }, 404)
    }
    if (await repository.hasReview(db, productId, userId)) {
      return c.json({ code: 'review_exists', message: 'You already reviewed this product' }, 409)
    }
    const { rating, comment } = c.req.valid('json')
    const id = await repository.insertReview(db, { productId, userId, rating, comment })
    const review = await repository.findReview(db, id)
    return c.json({ data: review! }, 201)
  },
)

// Editing is for the author only; deleting is for the author or an admin.
export const reviewRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  .patch(
    '/:id',
    describeRoute({
      tags: ['reviews'],
      summary: 'Edit my review',
      responses: {
        200: json('The updated review', reviewResponseSchema),
        401: errorResponse('Not signed in'),
        403: errorResponse('Not your review'),
        404: errorResponse('No such review'),
        422: errorResponse('Invalid rating or comment'),
      },
    }),
    validator('param', reviewParams, validationHook),
    validator('json', reviewUpdateBodySchema, validationHook),
    async (c) => {
      const db = getDb()
      const { id } = c.req.valid('param')
      const owner = await repository.findOwner(db, id)
      if (owner === undefined) return c.json(NOT_FOUND, 404)
      if (owner !== c.var.user.id) return c.json(FORBIDDEN, 403)
      await repository.updateReview(db, id, c.req.valid('json'))
      const review = await repository.findReview(db, id)
      return c.json({ data: review! }, 200)
    },
  )
  .delete(
    '/:id',
    describeRoute({
      tags: ['reviews'],
      summary: 'Delete my review (an admin can delete any)',
      responses: {
        204: { description: 'Deleted' },
        401: errorResponse('Not signed in'),
        403: errorResponse('Not your review, and you are not an admin'),
        404: errorResponse('No such review'),
        422: errorResponse('Invalid id'),
      },
    }),
    validator('param', reviewParams, validationHook),
    async (c) => {
      const db = getDb()
      const { id } = c.req.valid('param')
      const owner = await repository.findOwner(db, id)
      if (owner === undefined) return c.json(NOT_FOUND, 404)
      const isAdmin = c.var.user.role === 'admin'
      if (owner !== c.var.user.id && !isAdmin) return c.json(FORBIDDEN, 403)
      await repository.deleteReview(db, id)
      return c.body(null, 204)
    },
  )
