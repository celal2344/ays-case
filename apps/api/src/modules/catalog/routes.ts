import {
  categoryListResponseSchema,
  productDetailResponseSchema,
  productListResponseSchema,
} from '@ays/validators'
import { Hono } from 'hono'
import { describeRoute, resolver, validator } from 'hono-openapi'
import { z } from 'zod'

import { errorResponse, errorResponses } from '../../utils/openapi'
import { validationHook } from '../../utils/validation'
import { getProduct, listCategories, listProducts } from './service'

const json = (description: string, schema: Parameters<typeof resolver>[0]) => ({
  description,
  content: { 'application/json': { schema: resolver(schema) } },
})

const productParams = z.object({ id: z.coerce.number().int().positive() })

export const productRoutes = new Hono()
  .get(
    '/',
    describeRoute({
      tags: ['catalog'],
      summary: 'The whole catalog in one list',
      responses: {
        200: json('Products, without soft-deleted ones', productListResponseSchema),
        ...errorResponses(),
      },
    }),
    async (c) => c.json({ data: await listProducts() }, 200),
  )
  .get(
    '/:id',
    describeRoute({
      tags: ['catalog'],
      summary: 'Product detail with images, policies, rating histogram and reviews',
      responses: {
        200: json('The product', productDetailResponseSchema),
        ...errorResponses(404, 422),
        404: errorResponse('No such product'),
      },
    }),
    validator('param', productParams, validationHook),
    async (c) => {
      return c.json({ data: await getProduct(c.req.valid('param').id) }, 200)
    },
  )

export const categoryRoutes = new Hono().get(
  '/',
  describeRoute({
    tags: ['catalog'],
    summary: 'Categories in display order',
    responses: { 200: json('Categories', categoryListResponseSchema), ...errorResponses() },
  }),
  async (c) => c.json({ data: await listCategories() }, 200),
)
