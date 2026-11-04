import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'

import { resetAuth } from '../../src/auth'
import { setDb, type Database } from '../../src/db/client'
import * as schema from '../../src/db/schema'
import { runSeed } from '../../src/db/seed'

/**
 * An in-memory Postgres (PGlite) with the real migrations and the real seed applied, wired into
 * the app. No credentials needed, so these tests run anywhere, CI included.
 */
export async function useSeededDatabase() {
  const pg = new PGlite()
  const folder = new URL('../../src/db/migrations/', import.meta.url)
  for (const file of readdirSync(fileURLToPath(folder))
    .filter((f) => f.endsWith('.sql'))
    .sort()) {
    for (const statement of readFileSync(new URL(file, folder), 'utf8').split(
      '--> statement-breakpoint',
    )) {
      await pg.exec(statement)
    }
  }
  const db = drizzle(pg, { schema }) as unknown as Database
  await runSeed(db)
  setDb(db)
  resetAuth()
  return { db, close: () => pg.close() }
}

export async function signIn(
  request: (path: string, init?: RequestInit) => Response | Promise<Response>,
  username: string,
  password: string,
) {
  const res = await request('/api/auth/sign-in/username', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'http://localhost:5173' },
    body: JSON.stringify({ username, password }),
  })
  const cookie = res.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ')
  return { res, cookie }
}
