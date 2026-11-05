import {
  productIdListResponseSchema,
  reviewBodySchema,
  reviewResponseSchema,
  reviewUpdateBodySchema,
} from '@ays/validators'
import { Hono } from 'hono'
import { describeRoute, resolver, validator } from 'hono-openapi'
import { z } from 'zod'

import { requireAuth, type AuthEnv } from '../../middlewares/auth'
import { errorResponse } from '../../utils/openapi'
import { validationHook } from '../../utils/validation'
import { createReview, deleteReview, listMyReviewedProductIds, updateReview } from './service'

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
    const { id: productId } = c.req.valid('param')
    const result = await createReview(c.var.user.id, productId, c.req.valid('json'))
    if (result.ok) return c.json({ data: result.review }, 201)
    if (result.reason === 'product_not_found') {
      return c.json({ code: 'not_found', message: 'Product not found' }, 404)
    }
    return c.json({ code: 'review_exists', message: 'You already reviewed this product' }, 409)
  },
)

// Editing is for the author only; deleting is for the author or an admin.
export const reviewRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  .get(
    '/mine',
    describeRoute({
      tags: ['reviews'],
      summary: 'The product ids I have reviewed, newest review first',
      responses: {
        200: json('Product ids', productIdListResponseSchema),
        401: errorResponse('Not signed in'),
      },
    }),
    async (c) => c.json({ data: await listMyReviewedProductIds(c.var.user.id) }, 200),
  )
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
      const { id } = c.req.valid('param')
      const result = await updateReview(c.var.user.id, id, c.req.valid('json'))
      if (result.ok) return c.json({ data: result.value }, 200)
      return result.reason === 'not_found' ? c.json(NOT_FOUND, 404) : c.json(FORBIDDEN, 403)
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
      const { id } = c.req.valid('param')
      const result = await deleteReview(c.var.user.id, c.var.user.role, id)
      if (result.ok) return c.body(null, 204)
      return result.reason === 'not_found' ? c.json(NOT_FOUND, 404) : c.json(FORBIDDEN, 403)
    },
  )
