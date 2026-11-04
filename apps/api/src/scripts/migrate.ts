import { fileURLToPath } from 'node:url'

import { migrate } from 'drizzle-orm/postgres-js/migrator'

import { createDb } from '../db/client'
import { env } from '../utils/env'
import { logger } from '../utils/logger'

if (!env.DATABASE_URL_SESSION) throw new Error('DATABASE_URL_SESSION is not set')

const { client, db } = createDb(env.DATABASE_URL_SESSION)
try {
  await migrate(db, {
    migrationsFolder: fileURLToPath(new URL('../db/migrations', import.meta.url)),
  })
  logger.info('migrations applied')
} finally {
  await client.end()
}
