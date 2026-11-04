import { createDb } from '../db/client'
import { runSeed } from '../db/seed'
import { env } from '../utils/env'
import { logger } from '../utils/logger'

if (!env.DATABASE_URL_SESSION) throw new Error('DATABASE_URL_SESSION is not set')

const { client, db } = createDb(env.DATABASE_URL_SESSION)
try {
  logger.info(await runSeed(db), 'seed finished')
} finally {
  await client.end()
}
