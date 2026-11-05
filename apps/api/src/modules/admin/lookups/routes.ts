import {
  adminCategoryListResponseSchema,
  adminCategoryResponseSchema,
  adminPolicyListResponseSchema,
  adminPolicyResponseSchema,
  adminSluggedListResponseSchema,
  adminSluggedResponseSchema,
  brandBodySchema,
  brandPatchBodySchema,
  categoryBodySchema,
  categoryPatchBodySchema,
  policyBodySchema,
  policyPatchBodySchema,
} from '@ays/validators'
import { Hono } from 'hono'
import { describeRoute, resolver, validator } from 'hono-openapi'
import { z } from 'zod'

import { requireRole, type AuthEnv } from '../../../middlewares/auth'
import { errorResponse, errorResponses } from '../../../utils/openapi'
import { validationHook } from '../../../utils/validation'
import {
  brandService,
  categoryService,
  returnService,
  shippingService,
  tagService,
  warrantyService,
} from './service'

const json = (description: string, schema: Parameters<typeof resolver>[0]) => ({
  description,
  content: { 'application/json': { schema: resolver(schema) } },
})

const idParam = z.object({ id: z.coerce.number().int().positive() })

const errors = {
  401: errorResponse('Not signed in'),
  403: errorResponse('Not an admin'),
  404: errorResponse('No such item'),
  409: errorResponse('`duplicate` (slug, name or label taken) or `in_use` (products still use it)'),
  422: errorResponse('Invalid body'),
}

type Slugged = { id: number; slug: string; name: string }
type Policy = { id: number; label: string }

interface Service<Row, Create, Patch> {
  list: () => Promise<Row[]>
  create: (input: Create) => Promise<Row>
  update: (id: number, patch: Patch) => Promise<Row>
  remove: (id: number) => Promise<void>
}

type SluggedBody = { name: string; slug?: string | undefined }

/** Brands and tags: a name and a slug (made from the name when missing). */
function sluggedRoutes(service: Service<Slugged, SluggedBody, Partial<SluggedBody>>, tag: string) {
  return new Hono<AuthEnv>()
    .use(requireRole('admin'))
    .get(
      '/',
      describeRoute({
        tags: [tag],
        summary: `List ${tag}`,
        responses: {
          200: json(tag, adminSluggedListResponseSchema),
          ...errorResponses(),
          401: errors[401],
          403: errors[403],
        },
      }),
      async (c) => c.json({ data: await service.list() }, 200),
    )
    .post(
      '/',
      describeRoute({
        tags: [tag],
        summary: `Create (${tag})`,
        responses: {
          201: json('Created', adminSluggedResponseSchema),
          ...errorResponses(),
          401: errors[401],
          403: errors[403],
          409: errors[409],
          422: errors[422],
        },
      }),
      validator('json', brandBodySchema, validationHook),
      async (c) => {
        return c.json({ data: await service.create(c.req.valid('json')) }, 201)
      },
    )
    .patch(
      '/:id',
      describeRoute({
        tags: [tag],
        summary: `Update (${tag})`,
        responses: {
          200: json('Updated', adminSluggedResponseSchema),
          ...errorResponses(),
          401: errors[401],
          403: errors[403],
          404: errors[404],
          409: errors[409],
          422: errors[422],
        },
      }),
      validator('param', idParam, validationHook),
      validator('json', brandPatchBodySchema, validationHook),
      async (c) => {
        return c.json(
          { data: await service.update(c.req.valid('param').id, c.req.valid('json')) },
          200,
        )
      },
    )
    .delete(
      '/:id',
      describeRoute({
        tags: [tag],
        summary: `Delete (${tag}); refused while products use it`,
        responses: {
          204: { description: 'Deleted' },
          ...errorResponses(),
          401: errors[401],
          403: errors[403],
          404: errors[404],
          409: errors[409],
          422: errors[422],
        },
      }),
      validator('param', idParam, validationHook),
      async (c) => {
        await service.remove(c.req.valid('param').id)
        return c.body(null, 204)
      },
    )
}

/** Warranty, shipping and return policies: just a label. */
function policyRoutes(
  service: Service<Policy, { label: string }, Partial<{ label: string }>>,
  tag: string,
) {
  return new Hono<AuthEnv>()
    .use(requireRole('admin'))
    .get(
      '/',
      describeRoute({
        tags: [tag],
        summary: `List ${tag}`,
        responses: {
          200: json(tag, adminPolicyListResponseSchema),
          ...errorResponses(),
          401: errors[401],
          403: errors[403],
        },
      }),
      async (c) => c.json({ data: await service.list() }, 200),
    )
    .post(
      '/',
      describeRoute({
        tags: [tag],
        summary: `Create (${tag})`,
        responses: {
          201: json('Created', adminPolicyResponseSchema),
          ...errorResponses(),
          401: errors[401],
          403: errors[403],
          409: errors[409],
          422: errors[422],
        },
      }),
      validator('json', policyBodySchema, validationHook),
      async (c) => {
        return c.json({ data: await service.create(c.req.valid('json')) }, 201)
      },
    )
    .patch(
      '/:id',
      describeRoute({
        tags: [tag],
        summary: `Update (${tag})`,
        responses: {
          200: json('Updated', adminPolicyResponseSchema),
          ...errorResponses(),
          401: errors[401],
          403: errors[403],
          404: errors[404],
          409: errors[409],
          422: errors[422],
        },
      }),
      validator('param', idParam, validationHook),
      validator('json', policyPatchBodySchema, validationHook),
      async (c) => {
        return c.json(
          { data: await service.update(c.req.valid('param').id, c.req.valid('json')) },
          200,
        )
      },
    )
    .delete(
      '/:id',
      describeRoute({
        tags: [tag],
        summary: `Delete (${tag}); refused while products use it`,
        responses: {
          204: { description: 'Deleted' },
          ...errorResponses(),
          401: errors[401],
          403: errors[403],
          404: errors[404],
          409: errors[409],
          422: errors[422],
        },
      }),
      validator('param', idParam, validationHook),
      async (c) => {
        await service.remove(c.req.valid('param').id)
        return c.body(null, 204)
      },
    )
}

export const adminCategoryRoutes = new Hono<AuthEnv>()
  .use(requireRole('admin'))
  .get(
    '/',
    describeRoute({
      tags: ['categories'],
      summary: 'List categories with their sort order',
      responses: {
        200: json('Categories', adminCategoryListResponseSchema),
        ...errorResponses(),
        401: errors[401],
        403: errors[403],
      },
    }),
    async (c) => c.json({ data: await categoryService.list() }, 200),
  )
  .post(
    '/',
    describeRoute({
      tags: ['categories'],
      summary: 'Create a category',
      responses: {
        201: json('Created', adminCategoryResponseSchema),
        ...errorResponses(),
        401: errors[401],
        403: errors[403],
        409: errors[409],
        422: errors[422],
      },
    }),
    validator('json', categoryBodySchema, validationHook),
    async (c) => {
      return c.json({ data: await categoryService.create(c.req.valid('json')) }, 201)
    },
  )
  .patch(
    '/:id',
    describeRoute({
      tags: ['categories'],
      summary: 'Update a category',
      responses: {
        200: json('Updated', adminCategoryResponseSchema),
        ...errorResponses(),
        401: errors[401],
        403: errors[403],
        404: errors[404],
        409: errors[409],
        422: errors[422],
      },
    }),
    validator('param', idParam, validationHook),
    validator('json', categoryPatchBodySchema, validationHook),
    async (c) => {
      return c.json(
        { data: await categoryService.update(c.req.valid('param').id, c.req.valid('json')) },
        200,
      )
    },
  )
  .delete(
    '/:id',
    describeRoute({
      tags: ['categories'],
      summary: 'Delete a category; refused while products use it',
      responses: {
        204: { description: 'Deleted' },
        ...errorResponses(),
        401: errors[401],
        403: errors[403],
        404: errors[404],
        409: errors[409],
        422: errors[422],
      },
    }),
    validator('param', idParam, validationHook),
    async (c) => {
      await categoryService.remove(c.req.valid('param').id)
      return c.body(null, 204)
    },
  )

export const adminBrandRoutes = sluggedRoutes(brandService, 'brands')
export const adminTagRoutes = sluggedRoutes(tagService, 'tags')
export const adminWarrantyRoutes = policyRoutes(warrantyService, 'warranty-policies')
export const adminShippingRoutes = policyRoutes(shippingService, 'shipping-policies')
export const adminReturnRoutes = policyRoutes(returnService, 'return-policies')
