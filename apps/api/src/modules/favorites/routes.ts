import { productIdListResponseSchema } from '@ays/validators'
import { Hono } from 'hono'
import { describeRoute, resolver, validator } from 'hono-openapi'

import { requireAuth, type AuthEnv } from '../../middlewares/auth'
import { errorResponse } from '../../utils/openapi'
import { productIdParam, validationHook } from '../../utils/validation'
import { addFavorite, listFavorites, removeFavorite } from './service'

// Every route is scoped to the signed-in user (`c.var.user`); no user id is ever read from the request.
export const favoriteRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  .get(
    '/',
    describeRoute({
      tags: ['favorites'],
      summary: 'My favorite product ids, newest first',
      responses: {
        200: {
          description: 'Product ids',
          content: { 'application/json': { schema: resolver(productIdListResponseSchema) } },
        },
        401: errorResponse('Not signed in'),
      },
    }),
    async (c) => c.json({ data: await listFavorites(c.var.user.id) }, 200),
  )
  .put(
    '/:productId',
    describeRoute({
      tags: ['favorites'],
      summary: 'Favorite a product (idempotent)',
      responses: {
        204: { description: 'Favorited' },
        401: errorResponse('Not signed in'),
        404: errorResponse('Unknown or deleted product'),
        422: errorResponse('Invalid id'),
      },
    }),
    validator('param', productIdParam, validationHook),
    async (c) => {
      const { productId } = c.req.valid('param')
      if (!(await addFavorite(c.var.user.id, productId))) {
        return c.json({ code: 'not_found', message: 'Product not found' }, 404)
      }
      return c.body(null, 204)
    },
  )
  .delete(
    '/:productId',
    describeRoute({
      tags: ['favorites'],
      summary: 'Remove a favorite (idempotent)',
      responses: {
        204: { description: 'Removed, or it was not there' },
        401: errorResponse('Not signed in'),
        422: errorResponse('Invalid id'),
      },
    }),
    validator('param', productIdParam, validationHook),
    async (c) => {
      await removeFavorite(c.var.user.id, c.req.valid('param').productId)
      return c.body(null, 204)
    },
  )
