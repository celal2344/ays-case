import { DrizzleQueryError, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { requestId } from 'hono/request-id'
import pino from 'pino'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { getDb } from '../src/db/client'
import { products } from '../src/db/schema'
import { onError } from '../src/middlewares/error-handler'
import { root } from '../src/root'
import { dbError } from '../src/utils/db-errors'
import { appError } from '../src/utils/errors'
import { logger, loggerOptions } from '../src/utils/logger'
import { useSeededDatabase } from './helpers/test-db'

type Body = Record<string, unknown>

/** A tiny app whose only route throws what the test gives it, behind the real error handler. */
function appThrowing(error: unknown) {
  const app = new Hono().use(requestId({ limitLength: 64 })).get('/boom', () => {
    throw error
  })
  app.onError(onError)
  return app
}

const fetchBody = async (app: Hono, headers: Record<string, string> = {}) => {
  const res = await app.request('/boom', { headers })
  return { res, body: (await res.json()) as Body }
}

/** What pino would print for a logged entry, with our serializers. */
function printed(entry: unknown) {
  const lines: string[] = []
  pino({ ...loggerOptions, level: 'info' }, { write: (line: string) => lines.push(line) }).error(
    entry as object,
  )
  return lines.join('')
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('error answers', () => {
  it('uses the status of the code and sends only code, message and request id', async () => {
    const { res, body } = await fetchBody(
      appThrowing(appError('conflict', 'Taken', 'x.op', 'service', { id: 1 })),
    )
    expect(res.status).toBe(409)
    expect(body).toEqual({
      code: 'conflict',
      message: 'Taken',
      requestId: res.headers.get('x-request-id'),
    })
  })

  it('answers an unknown error with a generic 500 and never leaks its text', async () => {
    const { res, body } = await fetchBody(appThrowing(new Error('table users_private is missing')))
    expect(res.status).toBe(500)
    expect(body).toEqual({
      code: 'internal_error',
      message: 'Internal server error',
      requestId: res.headers.get('x-request-id'),
    })
  })

  it('echoes a safe request id and replaces an unsafe one', async () => {
    const app = appThrowing(appError('not_found', 'Nope', 'x.op', 'route'))
    const safe = await fetchBody(app, { 'x-request-id': 'abc-123' })
    expect(safe.res.headers.get('x-request-id')).toBe('abc-123')
    expect(safe.body.requestId).toBe('abc-123')
    const unsafe = await fetchBody(app, { 'x-request-id': 'has spaces <tags>' })
    expect(unsafe.res.headers.get('x-request-id')).not.toBe('has spaces <tags>')
    expect(unsafe.body.requestId).toBe(unsafe.res.headers.get('x-request-id'))
  })

  it('adds a debug object only in development', async () => {
    const error = dbError(new Error('relation "products" does not exist'), 'x.op', 'repo', {
      id: 3,
    })
    const production = await fetchBody(appThrowing(error))
    expect(production.body).not.toHaveProperty('debug')

    vi.stubEnv('NODE_ENV', 'development')
    const { body } = await fetchBody(appThrowing(error))
    expect(body.debug).toMatchObject({
      layer: 'repo',
      op: 'x.op',
      meta: { id: 3 },
      cause: { message: 'relation "products" does not exist' },
    })
  })
})

describe('error log', () => {
  const timeout = Object.assign(new Error('canceling statement due to statement timeout'), {
    name: 'PostgresError',
    code: '57014',
  })
  const wrapped = new DrizzleQueryError(
    'select "id" from "user" where "email" = $1',
    ['someone@example.com'],
    timeout,
  )

  it('has layer, op, meta and a compact cause, without SQL, params or secrets', async () => {
    const error = spyOn('error')
    const { res } = await fetchBody(
      appThrowing(dbError(wrapped, 'x.op', 'repo', { id: 9, password: 'hunter2' })),
      { 'x-request-id': 'req-1' },
    )
    expect(res.status).toBe(503)
    expect(error).toHaveBeenCalledTimes(1)
    const entry = error.mock.calls[0]![0] as Body
    expect(entry).toMatchObject({
      code: 'database_unavailable',
      status: 503,
      layer: 'repo',
      op: 'x.op',
      meta: { id: 9, password: '[redacted]' },
      requestId: 'req-1',
      method: 'GET',
      path: '/boom',
    })
    const line = JSON.parse(printed(entry)) as { err: Body }
    expect(line.err).toMatchObject({
      name: 'PostgresError',
      message: 'canceling statement due to statement timeout',
      pgCode: '57014',
    })
    expect(printed(entry)).not.toMatch(/select "id"|someone@example\.com|hunter2|DrizzleQueryError/)
  })

  it('warns for 4xx failures', async () => {
    const warn = spyOn('warn')
    await fetchBody(appThrowing(appError('not_found', 'Nope', 'x.op', 'route')))
    expect(warn).toHaveBeenCalledTimes(1)
  })
})

function spyOn(level: 'warn' | 'error') {
  return vi.spyOn(logger, level).mockImplementation(() => undefined)
}

describe('with a database', () => {
  let close: () => Promise<void>
  beforeAll(async () => {
    ;({ close } = await useSeededDatabase())
  })
  afterAll(async () => {
    await close()
  })

  async function insertFailure(change: Partial<typeof products.$inferInsert>) {
    const db = getDb()
    const [existing] = await db.select().from(products).limit(1)
    const { id, ...copy } = existing!
    void id
    try {
      await db.insert(products).values({ ...copy, ...change })
    } catch (cause) {
      return dbError(cause, 'x.insert', 'repo')
    }
    throw new Error('the insert should have failed')
  }

  it('maps real Postgres errors: unique, foreign key, check, invalid input', async () => {
    const [existing] = await getDb().select().from(products).limit(1)
    expect(await insertFailure({ sku: existing!.sku })).toMatchObject({
      status: 409,
      code: 'conflict',
    })
    expect(
      await insertFailure({ sku: 'FK-TEST', barcode: null, categoryId: 999999 }),
    ).toMatchObject({ status: 422, code: 'unknown_reference' })
    expect(await insertFailure({ sku: 'CHECK-TEST', barcode: null, priceCents: -1 })).toMatchObject(
      { status: 422, code: 'validation_error' },
    )
    const invalid = await getDb()
      .execute(sql`select 'abc'::int`)
      .catch((cause: unknown) => dbError(cause, 'x.cast', 'repo'))
    expect(invalid).toMatchObject({ status: 400, code: 'bad_request' })
  })

  it('answers a missing product with 404, logging layer repo, op and meta.id', async () => {
    const warn = spyOn('warn')
    const res = await root.request('/api/products/987654', {
      headers: { 'x-request-id': 'miss-1' },
    })
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({
      code: 'not_found',
      message: 'Product not found',
      requestId: 'miss-1',
    })
    expect(warn.mock.calls[0]![0]).toMatchObject({
      layer: 'repo',
      op: 'catalog.findProductDetail',
      meta: { id: 987654 },
      requestId: 'miss-1',
    })
  })

  // PGlite does not enforce statement_timeout, so Postgres's 57014 is simulated at the driver,
  // wrapped by Drizzle exactly as postgres-js errors are.
  it('answers a statement timeout (57014) with 503 database_unavailable and keeps serving', async () => {
    const timeout = Object.assign(new Error('canceling statement due to statement timeout'), {
      name: 'PostgresError',
      code: '57014',
    })
    const error = spyOn('error')
    vi.spyOn(getDb(), 'select').mockImplementation(() => {
      throw new DrizzleQueryError('select "id" from "products"', [], timeout)
    })
    const res = await root.request('/api/products')
    expect(res.status).toBe(503)
    expect(await res.json()).toMatchObject({ code: 'database_unavailable' })
    expect(error).toHaveBeenCalledTimes(1)

    vi.restoreAllMocks()
    expect((await root.request('/api/products')).status).toBe(200)
  })

  it('documents the standard error responses on the catalog and users routes', async () => {
    const doc = (await (await root.request('/api/openapi.json')).json()) as {
      paths: Record<string, Record<string, { responses: Record<string, unknown> }>>
    }
    const statuses = (path: string) => Object.keys(doc.paths[path]!.get!.responses)
    expect(statuses('/products/{id}')).toEqual(expect.arrayContaining(['404', '422', '503']))
    expect(statuses('/users')).toEqual(expect.arrayContaining(['401', '403', '500', '503']))
  })
})
