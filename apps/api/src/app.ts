import { Scalar } from '@scalar/hono-api-reference'
import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'
import { openAPIRouteHandler } from 'hono-openapi'

import { notFound, onError } from './middlewares/error-handler'
import { getAuth } from './auth'
import { requestLogger } from './middlewares/request-logger'
import {
  adminBrandRoutes,
  adminCategoryRoutes,
  adminReturnRoutes,
  adminShippingRoutes,
  adminTagRoutes,
  adminWarrantyRoutes,
} from './modules/admin/lookups/routes'
import { adminProductListRoutes, productAdminRoutes } from './modules/admin/products/routes'
import { cartRoutes } from './modules/cart/routes'
import { categoryRoutes, productRoutes } from './modules/catalog/routes'
import { favoriteRoutes } from './modules/favorites/routes'
import { healthRoutes } from './modules/health/routes'
import { orderRoutes } from './modules/orders/routes'
import { recentlyViewedRoutes } from './modules/recently-viewed/routes'
import { productReviewRoutes, reviewRoutes } from './modules/reviews/routes'
import { userRoutes } from './modules/admin/users/routes'
import { openApiDocumentation } from './utils/openapi'

// Chained so `AppType` carries every route for the RPC client.
const app = new Hono()
  .use(requestLogger)
  .use(secureHeaders())
  // Better Auth serves /api/auth/* itself (sign-in, session, sign-out, admin plugin).
  .on(['GET', 'POST'], '/auth/*', (c) => getAuth().handler(c.req.raw))
  .route('/health', healthRoutes)
  .route('/products', productRoutes)
  .route('/products', productReviewRoutes)
  .route('/products', productAdminRoutes)
  .route('/admin/products', adminProductListRoutes)
  .route('/admin/categories', adminCategoryRoutes)
  .route('/admin/brands', adminBrandRoutes)
  .route('/admin/tags', adminTagRoutes)
  .route('/admin/warranty-policies', adminWarrantyRoutes)
  .route('/admin/shipping-policies', adminShippingRoutes)
  .route('/admin/return-policies', adminReturnRoutes)
  .route('/reviews', reviewRoutes)
  .route('/orders', orderRoutes)
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
