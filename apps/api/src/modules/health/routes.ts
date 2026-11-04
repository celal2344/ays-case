import { Hono } from 'hono'
import { describeRoute, resolver } from 'hono-openapi'

import { healthSchema } from './schemas'

export const healthRoutes = new Hono().get(
  '/',
  describeRoute({
    tags: ['system'],
    summary: 'Liveness check',
    responses: {
      200: {
        description: 'The API is up',
        content: { 'application/json': { schema: resolver(healthSchema) } },
      },
    },
  }),
  (c) => c.json({ data: { status: 'ok' as const } }, 200),
)
