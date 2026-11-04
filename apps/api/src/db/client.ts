import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { env } from '../utils/env'
import * as schema from './schema'

export type Database = ReturnType<typeof createDb>['db']

/** Prepared statements are off: the transaction pooler (port 6543) does not support them. */
export function createDb(url: string, options: { searchPath?: string; max?: number } = {}) {
  const client = postgres(url, {
    prepare: false,
    max: options.max ?? 1,
    connection: options.searchPath ? { search_path: options.searchPath } : undefined,
  })
  return { client, db: drizzle(client, { schema }) }
}

let shared: Database | undefined

/** The runtime connection (transaction pooler), created on first use so `/health` needs no database. */
export function getDb(): Database {
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set')
  shared ??= createDb(env.DATABASE_URL).db
  return shared
}
