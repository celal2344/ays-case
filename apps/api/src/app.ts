import { Scalar } from '@scalar/hono-api-reference'
import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'
import { openAPIRouteHandler } from 'hono-openapi'

import { notFound, onError } from './middlewares/error-handler'
import { requestLogger } from './middlewares/request-logger'
import { healthRoutes } from './modules/health/routes'
import { openApiDocumentation } from './utils/openapi'

// Chained so `AppType` carries every route for the RPC client.
const app = new Hono().use(requestLogger).use(secureHeaders()).route('/health', healthRoutes)

app.onError(onError)
app.notFound(notFound)
app.get('/openapi.json', openAPIRouteHandler(app, { documentation: openApiDocumentation }))
app.get('/docs', Scalar({ url: '/api/openapi.json' }))

export type AppType = typeof app
export { app }
