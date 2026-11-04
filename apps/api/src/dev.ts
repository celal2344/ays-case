import { serve } from '@hono/node-server'

import { root } from './root'
import { logger } from './utils/logger'

const port = Number(process.env.PORT ?? 3000)

serve({ fetch: root.fetch, port }, (info) => {
  logger.info({ port: info.port }, 'api listening')
})
