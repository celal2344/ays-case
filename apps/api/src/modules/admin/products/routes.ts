import {
  adminProductListResponseSchema,
  productBodySchema,
  productDetailResponseSchema,
  productPatchBodySchema,
} from '@ays/validators'
import { Hono } from 'hono'
import { describeRoute, resolver, validator } from 'hono-openapi'
import { z } from 'zod'

import { requireRole, type AuthEnv } from '../../../middlewares/auth'
import { errorResponse, errorResponses } from '../../../utils/openapi'
import { validationHook } from '../../../utils/validation'
import { listAdminProducts } from '../../catalog/service'
import { createProduct, restoreProduct, softDeleteProduct, updateProduct } from './service'

const json = (description: string, schema: Parameters<typeof resolver>[0]) => ({
  description,
  content: { 'application/json': { schema: resolver(schema) } },
})

const idParam = z.object({ id: z.coerce.number().int().positive() })

const errors = {
  401: errorResponse('Not signed in'),
  403: errorResponse('Not an admin'),
  404: errorResponse('No such product'),
  409: errorResponse('`duplicate`: the sku or barcode is taken'),
  422: errorResponse('Invalid body, or `unknown_reference` for a category, brand, policy or tag'),
}

// Mounted next to the public catalog routes at /products; each route carries its own admin guard.
export const productAdminRoutes = new Hono<AuthEnv>()
  .post(
    '/',
    describeRoute({
      tags: ['admin-products'],
      summary: 'Create a product',
      responses: {
        201: json('The new product', productDetailResponseSchema),
        ...errorResponses(),
        401: errors[401],
        403: errors[403],
        409: errors[409],
        422: errors[422],
      },
    }),
    requireRole('admin'),
    validator('json', productBodySchema, validationHook),
    async (c) => {
      return c.json({ data: await createProduct(c.req.valid('json')) }, 201)
    },
  )
  .patch(
    '/:id',
    describeRoute({
      tags: ['admin-products'],
      summary: 'Update a product; tags and images, when sent, replace the old ones',
      responses: {
        200: json('The updated product', productDetailResponseSchema),
        ...errorResponses(),
        401: errors[401],
        403: errors[403],
        404: errors[404],
        409: errors[409],
        422: errors[422],
      },
    }),
    requireRole('admin'),
    validator('param', idParam, validationHook),
    validator('json', productPatchBodySchema, validationHook),
    async (c) => {
      return c.json(
        { data: await updateProduct(c.req.valid('param').id, c.req.valid('json')) },
        200,
      )
    },
  )
  .delete(
    '/:id',
    describeRoute({
      tags: ['admin-products'],
      summary:
        'Soft delete: hidden from the shop and removed from carts, favorites and recently viewed',
      responses: {
        204: { description: 'Deleted' },
        ...errorResponses(),
        401: errors[401],
        403: errors[403],
        404: errors[404],
        422: errors[422],
      },
    }),
    requireRole('admin'),
    validator('param', idParam, validationHook),
    async (c) => {
      await softDeleteProduct(c.req.valid('param').id)
      return c.body(null, 204)
    },
  )
  .post(
    '/:id/restore',
    describeRoute({
      tags: ['admin-products'],
      summary: 'Bring a soft-deleted product back',
      responses: {
        200: json('The restored product', productDetailResponseSchema),
        ...errorResponses(),
        401: errors[401],
        403: errors[403],
        404: errors[404],
        422: errors[422],
      },
    }),
    requireRole('admin'),
    validator('param', idParam, validationHook),
    async (c) => {
      return c.json({ data: await restoreProduct(c.req.valid('param').id) }, 200)
    },
  )

/** `GET /admin/products`: every product, soft-deleted ones included. */
export const adminProductListRoutes = new Hono<AuthEnv>().get(
  '/',
  describeRoute({
    tags: ['admin-products'],
    summary: 'All products including soft-deleted ones',
    responses: {
      200: json('Products with `deletedAt`', adminProductListResponseSchema),
      ...errorResponses(),
      401: errors[401],
      403: errors[403],
    },
  }),
  requireRole('admin'),
  async (c) => c.json({ data: await listAdminProducts() }, 200),
)
