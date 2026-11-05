import {
  userCreateBodySchema,
  userListResponseSchema,
  userPatchBodySchema,
  userResponseSchema,
} from '@ays/validators'
import { Hono } from 'hono'
import { describeRoute, resolver, validator } from 'hono-openapi'
import { z } from 'zod'

import { requireRole, type AuthEnv } from '../../../middlewares/auth'
import { errorResponse, errorResponses } from '../../../utils/openapi'
import { validationHook } from '../../../utils/validation'
import { createUser, deleteUser, listUsers, updateUser } from './service'

const json = (description: string, schema: Parameters<typeof resolver>[0]) => ({
  description,
  content: { 'application/json': { schema: resolver(schema) } },
})

const idParam = z.object({ id: z.string().min(1) })

const errors = {
  401: errorResponse('Not signed in'),
  403: errorResponse('Signed in, but not an admin'),
  404: errorResponse('No such user'),
  409: errorResponse(
    '`duplicate` (username or email), `cannot_delete_self`, `cannot_demote_self` or `last_admin`',
  ),
  422: errorResponse('Invalid body'),
}

export const userRoutes = new Hono<AuthEnv>()
  .get(
    '/',
    describeRoute({
      tags: ['users'],
      summary: 'All users (admin only)',
      responses: {
        200: json('Users, without any secrets', userListResponseSchema),
        ...errorResponses(),
        401: errors[401],
        403: errors[403],
      },
    }),
    requireRole('admin'),
    async (c) => c.json({ data: await listUsers() }, 200),
  )
  .post(
    '/',
    describeRoute({
      tags: ['users'],
      summary: 'Create a user with an initial password (hashed by Better Auth)',
      responses: {
        201: json('The new user', userResponseSchema),
        ...errorResponses(),
        401: errors[401],
        403: errors[403],
        409: errors[409],
        422: errors[422],
      },
    }),
    requireRole('admin'),
    validator('json', userCreateBodySchema, validationHook),
    async (c) => {
      return c.json({ data: await createUser(c.req.valid('json'), c.req.raw.headers) }, 201)
    },
  )
  .patch(
    '/:id',
    describeRoute({
      tags: ['users'],
      summary: 'Change a user; demoting also ends their sessions',
      responses: {
        200: json('The updated user', userResponseSchema),
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
    validator('json', userPatchBodySchema, validationHook),
    async (c) => {
      const { id } = c.req.valid('param')
      return c.json({ data: await updateUser(id, c.req.valid('json'), c.var.user.id) }, 200)
    },
  )
  .delete(
    '/:id',
    describeRoute({
      tags: ['users'],
      summary: 'Delete a user (their sessions, cart, orders and reviews go with them)',
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
    requireRole('admin'),
    validator('param', idParam, validationHook),
    async (c) => {
      await deleteUser(c.req.valid('param').id, c.var.user.id)
      return c.body(null, 204)
    },
  )
