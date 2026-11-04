import { Hono } from 'hono'

import { app } from './app'
import { notFound, onError } from './middlewares/error-handler'

/**
 * The deployable app: the prefix-free API mounted under /api, which is the path Vercel Services
 * hands to the service unchanged. `AppType` stays prefix-free; clients use the base URL `/api`.
 */
export const root = new Hono().route('/api', app)

// A mounted app brings its error handler but not its notFound, so unknown paths need both here.
root.onError(onError)
root.notFound(notFound)
