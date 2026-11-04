import { productIdListResponseSchema } from '@ays/validators'
import { Hono } from 'hono'
import { describeRoute, resolver, validator } from 'hono-openapi'

import { getDb } from '../../db/client'
import { requireAuth, type AuthEnv } from '../../middlewares/auth'
import { errorResponse } from '../../utils/openapi'
import { productIdParam, validationHook } from '../../utils/validation'
import * as repository from './repository'

// Every route is scoped to the signed-in user (`c.var.user`); no user id is ever read from the request.
export const recentlyViewedRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  .get(
    '/',
    describeRoute({
      tags: ['recently-viewed'],
      summary: 'My recently viewed product ids, newest first',
      responses: {
        200: {
          description: 'Product ids',
          content: { 'application/json': { schema: resolver(productIdListResponseSchema) } },
        },
        401: errorResponse('Not signed in'),
      },
    }),
    async (c) => c.json({ data: await repository.listRecentlyViewed(getDb(), c.var.user.id) }, 200),
  )
  .put(
    '/:productId',
    describeRoute({
      tags: ['recently-viewed'],
      summary: 'Record a view; the list is trimmed to the newest 12',
      responses: {
        204: { description: 'Recorded' },
        401: errorResponse('Not signed in'),
        404: errorResponse('Unknown or deleted product'),
        422: errorResponse('Invalid id'),
      },
    }),
    validator('param', productIdParam, validationHook),
    async (c) => {
      const { productId } = c.req.valid('param')
      const db = getDb()
      if (!(await repository.productExists(db, productId))) {
        return c.json({ code: 'not_found', message: 'Product not found' }, 404)
      }
      await repository.recordView(db, c.var.user.id, productId)
      return c.body(null, 204)
    },
  )
  .delete(
    '/',
    describeRoute({
      tags: ['recently-viewed'],
      summary: 'Clear my recently viewed list',
      responses: { 204: { description: 'Cleared' }, 401: errorResponse('Not signed in') },
    }),
    async (c) => {
      await repository.clearRecentlyViewed(getDb(), c.var.user.id)
      return c.body(null, 204)
    },
  )
