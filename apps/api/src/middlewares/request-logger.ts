import { createMiddleware } from 'hono/factory'

import { logger } from '../utils/logger'

export const requestLogger = createMiddleware(async (c, next) => {
  const start = performance.now()
  await next()
  logger.info({
    requestId: c.get('requestId'),
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    ms: Math.round(performance.now() - start),
  })
})
