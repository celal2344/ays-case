import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { getDb } from '../src/db/client'
import { root } from '../src/root'
import { useSeededDatabase } from './helpers/test-db'

let close: () => Promise<void>

beforeAll(async () => {
  ;({ close } = await useSeededDatabase())
})
afterAll(async () => {
  await close()
})

describe('row level security', () => {
  it('is on for every table and the rating view runs with its caller rights', async () => {
    const tables = await getDb().execute<{ relname: string; relrowsecurity: boolean }>(sql`
      select c.relname, c.relrowsecurity
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
    `)
    const rows = Array.isArray(tables) ? tables : tables.rows
    expect(rows.length).toBeGreaterThan(15)
    expect(rows.filter((t) => !t.relrowsecurity).map((t) => t.relname)).toEqual([])

    const views = await getDb().execute<{ reloptions: string[] | null }>(sql`
      select c.reloptions from pg_class c
      where c.relname = 'product_rating_stats' and c.relkind = 'v'
    `)
    const view = (Array.isArray(views) ? views : views.rows)[0]
    expect(view?.reloptions).toContain('security_invoker=true')
  })
})

describe('sign-in rate limit', () => {
  const attempt = (ip: string) =>
    root.request('/api/auth/sign-in/username', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'http://localhost:5173',
        'x-forwarded-for': ip,
      },
      body: JSON.stringify({ username: 'emilys', password: 'wrong-password' }),
    })

  it('answers 429 on the sixth wrong attempt within a minute, per IP', async () => {
    for (let i = 0; i < 5; i++) expect((await attempt('203.0.113.7')).status).toBe(401)
    expect((await attempt('203.0.113.7')).status).toBe(429)
    // another address has its own counter
    expect((await attempt('203.0.113.8')).status).toBe(401)
  })
})
