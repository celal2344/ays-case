import { roleSchema, userListResponseSchema } from '@ays/validators'
import { asc } from 'drizzle-orm'
import { Hono } from 'hono'
import { describeRoute, resolver } from 'hono-openapi'

import { getDb } from '../../db/client'
import { user } from '../../db/schema'
import { requireRole } from '../../middlewares/auth'
import { errorResponse } from '../../utils/openapi'

export const userRoutes = new Hono().get(
  '/',
  describeRoute({
    tags: ['users'],
    summary: 'All users (admin only)',
    responses: {
      200: {
        description: 'Users, without any secrets',
        content: { 'application/json': { schema: resolver(userListResponseSchema) } },
      },
      401: errorResponse('Not signed in'),
      403: errorResponse('Signed in, but not an admin'),
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
