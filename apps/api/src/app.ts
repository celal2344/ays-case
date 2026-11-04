import { Scalar } from '@scalar/hono-api-reference'
import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'
import { openAPIRouteHandler } from 'hono-openapi'

import { notFound, onError } from './middlewares/error-handler'
import { getAuth } from './auth'
import { requestLogger } from './middlewares/request-logger'
import { cartRoutes } from './modules/cart/routes'
import { categoryRoutes, productRoutes } from './modules/catalog/routes'
import { favoriteRoutes } from './modules/favorites/routes'
import { healthRoutes } from './modules/health/routes'
import { recentlyViewedRoutes } from './modules/recently-viewed/routes'
import { userRoutes } from './modules/users/routes'
import { openApiDocumentation } from './utils/openapi'

// Chained so `AppType` carries every route for the RPC client.
const app = new Hono()
  .use(requestLogger)
  .use(secureHeaders())
  // Better Auth serves /api/auth/* itself (sign-in, session, sign-out, admin plugin).
  .on(['GET', 'POST'], '/auth/*', (c) => getAuth().handler(c.req.raw))
  .route('/health', healthRoutes)
  .route('/products', productRoutes)
  .route('/categories', categoryRoutes)
  .route('/users', userRoutes)
  .route('/cart', cartRoutes)
  .route('/favorites', favoriteRoutes)
  .route('/recently-viewed', recentlyViewedRoutes)

app.onError(onError)
app.notFound(notFound)
app.get('/openapi.json', openAPIRouteHandler(app, { documentation: openApiDocumentation }))
app.get('/docs', Scalar({ url: '/api/openapi.json' }))

export type AppType = typeof app
export { app }
