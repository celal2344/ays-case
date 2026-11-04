import {
  roleSchema,
  userCreateBodySchema,
  userListResponseSchema,
  userPatchBodySchema,
  userResponseSchema,
} from '@ays/validators'
import { asc } from 'drizzle-orm'
import { Hono } from 'hono'
import { describeRoute, resolver, validator } from 'hono-openapi'
import { z } from 'zod'

import { getDb } from '../../../db/client'
import { user } from '../../../db/schema'
import { requireRole, type AuthEnv } from '../../../middlewares/auth'
import { errorResponse } from '../../../utils/openapi'
import { validationHook } from '../../../utils/validation'
import { createUser, deleteUser, updateUser, type UserFailure } from './service'

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

const body = (result: UserFailure) => ({ code: result.code, message: result.message })

export const userRoutes = new Hono<AuthEnv>()
  .get(
    '/',
    describeRoute({
      tags: ['users'],
      summary: 'All users (admin only)',
      responses: {
        200: json('Users, without any secrets', userListResponseSchema),
        401: errors[401],
        403: errors[403],
      },
    }),
    requireRole('admin'),
    async (c) => {
      const rows = await getDb()
        .select({
          id: user.id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          image: user.image,
        })
        .from(user)
        .orderBy(asc(user.createdAt), asc(user.id))
      return c.json(
        { data: rows.map((row) => ({ ...row, role: roleSchema.catch('user').parse(row.role) })) },
        200,
      )
    },
  )
  .post(
    '/',
    describeRoute({
      tags: ['users'],
      summary: 'Create a user with an initial password (hashed by Better Auth)',
      responses: {
        201: json('The new user', userResponseSchema),
        401: errors[401],
        403: errors[403],
        409: errors[409],
        422: errors[422],
      },
    }),
    requireRole('admin'),
    validator('json', userCreateBodySchema, validationHook),
    async (c) => {
      const result = await createUser(c.req.valid('json'), c.req.raw.headers)
      if (result.ok) return c.json({ data: result.user }, 201)
      return c.json(body(result), 409)
    },
  )
  .patch(
    '/:id',
    describeRoute({
      tags: ['users'],
      summary: 'Change a user; demoting also ends their sessions',
      responses: {
        200: json('The updated user', userResponseSchema),
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
      const result = await updateUser(c.req.valid('param').id, c.req.valid('json'), c.var.user.id)
      if (result.ok) return c.json({ data: result.user }, 200)
      return result.status === 404 ? c.json(body(result), 404) : c.json(body(result), 409)
    },
  )
  .delete(
    '/:id',
    describeRoute({
      tags: ['users'],
      summary: 'Delete a user (their sessions, cart, orders and reviews go with them)',
      responses: {
        204: { description: 'Deleted' },
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
      const result = await deleteUser(c.req.valid('param').id, c.var.user.id)
      if (result.ok) return c.body(null, 204)
      return result.status === 404 ? c.json(body(result), 404) : c.json(body(result), 409)
    },
  )
