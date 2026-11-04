import { DrizzleQueryError, sql } from 'drizzle-orm'
import { Hono, type Context } from 'hono'
import { requestId } from 'hono/request-id'
import pino from 'pino'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { getDb } from '../src/db/client'
import { products } from '../src/db/schema'
import { createErrorHandler } from '../src/middlewares/error-handler'
import { root } from '../src/root'
import { dbError } from '../src/utils/db-errors'
import { errorsFor } from '../src/utils/error-helpers'
import { redactMeta, serializeErr } from '../src/utils/error-log'
import { loggerOptions } from '../src/utils/logger'
import { useSeededDatabase } from './helpers/test-db'

const fail = errorsFor('test', 'service')

type Body = Record<string, unknown>

function logCapture() {
  const lines: Body[] = []
  const log = pino(
    { ...loggerOptions, level: 'debug' },
    { write: (s: string) => lines.push(JSON.parse(s)) },
  )
  return { log, lines }
}

/** A tiny app whose only route throws what the test gives it, behind the real error handler. */
function appThrowing(
  thrower: (c: Context) => unknown,
  options: { debug?: boolean; log?: pino.Logger } = {},
) {
  const app = new Hono().use(requestId({ limitLength: 64 })).get('/boom', async (c) => {
    await thrower(c)
    return c.text('ok')
  })
  app.onError(
    createErrorHandler({
      debug: options.debug ?? false,
      ...(options.log ? { log: options.log } : {}),
    }),
  )
  return app
}

const get = async (app: Hono, headers: Record<string, string> = {}) => {
  const res = await app.request('/boom', { headers })
  return { res, body: (await res.json()) as Body }
}

describe('error helpers', () => {
  const cases = [
    ['badRequest', 400, 'bad_request'],
    ['unauthorized', 401, 'unauthorized'],
    ['forbidden', 403, 'forbidden'],
    ['notFound', 404, 'not_found'],
    ['conflict', 409, 'conflict'],
    ['unprocessable', 422, 'validation_error'],
  ] as const

  it.each(cases)(
    '%s answers %i %s with only code, message and request id',
    async (name, status, code) => {
      const { res, body } = await get(
        appThrowing(() => {
          throw fail[name]('op', 'Safe text', { id: 7 })
        }),
      )
      expect(res.status).toBe(status)
      expect(body).toEqual({
        code,
        message: 'Safe text',
        requestId: res.headers.get('x-request-id'),
      })
    },
  )

  it('unavailable answers 503 database_unavailable with a generic message', async () => {
    const { res, body } = await get(
      appThrowing(() => {
        throw fail.unavailable('op', new Error('connect ECONNREFUSED 10.0.0.1:5432'))
      }),
    )
    expect(res.status).toBe(503)
    expect(body.code).toBe('database_unavailable')
    expect(JSON.stringify(body)).not.toContain('ECONNREFUSED')
  })

  it('builds the op from scope, layer and name', () => {
    const error = errorsFor('catalog', 'repository').notFound('getById', 'Nope', { id: 1 })
    expect(error).toMatchObject({
      layer: 'repository',
      op: 'catalog.repository.getById',
      meta: { id: 1 },
    })
  })

  it('answers an unknown error with a generic 500 and never leaks its text', async () => {
    const { res, body } = await get(
      appThrowing(() => {
        throw new Error('secret table users_private is missing')
      }),
    )
    expect(res.status).toBe(500)
    expect(body).toEqual({
      code: 'internal_error',
      message: 'Internal server error',
      requestId: res.headers.get('x-request-id'),
    })
  })

  it('never puts layer, op or meta in the body outside development', async () => {
    const { body } = await get(
      appThrowing(() => {
        throw fail.notFound('op', 'Nope', { id: 1 })
      }),
    )
    expect(Object.keys(body).sort()).toEqual(['code', 'message', 'requestId'])
  })
})

describe('dev debug object', () => {
  const thrower = () => {
    throw fail.dbError('op', new Error('relation "products" does not exist'), { id: 3 })
  }

  it('carries layer, op, meta, the cause and a stack in development', async () => {
    const { body } = await get(appThrowing(thrower, { debug: true }))
    expect(body.debug).toMatchObject({
      layer: 'service',
      op: 'test.service.op',
      meta: { id: 3 },
      cause: { name: 'Error', message: 'relation "products" does not exist' },
    })
    expect(typeof (body.debug as Body).stack).toBe('string')
  })

  it('is absent when debug is off', async () => {
    const { body } = await get(appThrowing(thrower, { debug: false }))
    expect(body).not.toHaveProperty('debug')
  })
})

describe('request id', () => {
  const app = appThrowing(() => {
    throw fail.notFound('op', 'Nope')
  })

  it('echoes a short safe incoming id in the header and the body', async () => {
    const { res, body } = await get(app, { 'x-request-id': 'abc-123' })
    expect(res.headers.get('x-request-id')).toBe('abc-123')
    expect(body.requestId).toBe('abc-123')
  })

  it.each(['has spaces and <tags>', 'x'.repeat(200)])(
    'replaces an unsafe id (%#)',
    async (incoming) => {
      const { res, body } = await get(app, { 'x-request-id': incoming })
      expect(res.headers.get('x-request-id')).not.toBe(incoming)
      expect(body.requestId).toBe(res.headers.get('x-request-id'))
      expect(String(body.requestId).length).toBeGreaterThan(8)
    },
  )
})

describe('error log entry', () => {
  const driverError = Object.assign(new Error('canceling statement due to statement timeout'), {
    name: 'PostgresError',
    code: '57014',
  })
  const wrapped = new DrizzleQueryError(
    'select "id" from "user" where "email" = $1',
    ['someone@example.com'],
    driverError,
  )

  it('has layer, op, meta, request context and a compact cause, and no SQL or params', async () => {
    const { log, lines } = logCapture()
    const app = appThrowing(
      () => {
        throw fail.dbError('listThings', wrapped, { id: 9, password: 'hunter2', note: 'ok' })
      },
      { log },
    )
    const { res } = await get(app, { 'x-request-id': 'req-1' })
    expect(res.status).toBe(503)

    const errors = lines.filter((line) => line.level === 50)
    expect(errors).toHaveLength(1)
    const entry = errors[0]!
    expect(entry).toMatchObject({
      code: 'database_unavailable',
      status: 503,
      layer: 'service',
      op: 'test.service.listThings',
      meta: { id: 9, password: '[redacted]', note: 'ok' },
      requestId: 'req-1',
      method: 'GET',
      path: '/boom',
      err: {
        name: 'PostgresError',
        message: 'canceling statement due to statement timeout',
        pgCode: '57014',
      },
    })
    const text = JSON.stringify(entry)
    expect(text).not.toContain('select "id"')
    expect(text).not.toContain('someone@example.com')
    expect(text).not.toContain('hunter2')
    expect(text).not.toContain('DrizzleQueryError')
    expect((text.match(/\\n\s+at /g) ?? []).length).toBeLessThanOrEqual(8)
  })

  it('logs known 4xx failures at warn and the SQL only at debug', async () => {
    const { log, lines } = logCapture()
    await get(
      appThrowing(
        () => {
          throw fail.notFound('op', 'Nope', { id: 1 })
        },
        { log },
      ),
    )
    expect(lines.map((line) => line.level)).toEqual([40])

    const second = logCapture()
    await get(
      appThrowing(
        () => {
          throw wrapped
        },
        { log: second.log },
      ),
    )
    const debugLines = second.lines.filter((line) => line.level === 20)
    expect(debugLines).toHaveLength(1)
    expect(debugLines[0]).toMatchObject({ query: 'select "id" from "user" where "email" = $1' })
    expect(
      second.lines
        .filter((line) => line.level !== 20)
        .map((l) => JSON.stringify(l))
        .join(),
    ).not.toContain('select "id"')
  })

  it('serializes a query wrapper without a cause as a short message', () => {
    expect(serializeErr(new DrizzleQueryError('select 1', ['x']))).toMatchObject({
      message: 'Database query failed',
    })
  })
})

describe('redaction', () => {
  it('masks secret-looking keys at any depth and leaves the rest', () => {
    expect(
      redactMeta({
        id: 1,
        Password: 'p',
        user: { email: 'a@b.c', name: 'n', tokens: ['x'] },
        list: [{ authorization: 'Bearer z', ok: true }],
        cookie: 'c',
        secret: 's',
      }),
    ).toEqual({
      id: 1,
      Password: '[redacted]',
      user: { email: '[redacted]', name: 'n', tokens: '[redacted]' },
      list: [{ authorization: '[redacted]', ok: true }],
      cookie: '[redacted]',
      secret: '[redacted]',
    })
  })
})

describe('with a database', () => {
  let close: () => Promise<void>
  beforeAll(async () => {
    ;({ close } = await useSeededDatabase())
  })
  afterAll(async () => {
    await close()
  })

  async function violation(change: Partial<typeof products.$inferInsert>) {
    const db = getDb()
    const [existing] = await db.select().from(products).limit(1)
    const { id: _id, ...copy } = existing!
    void _id
    try {
      await db.insert(products).values({ ...copy, ...change })
    } catch (error) {
      return dbError(error, 'test.repository.insert', { change: Object.keys(change) })
    }
    throw new Error('the insert should have failed')
  }

  it('maps a duplicate SKU to 409 conflict and keeps the Postgres error as cause', async () => {
    const [existing] = await getDb().select().from(products).limit(1)
    const error = await violation({ sku: existing!.sku })
    expect(error).toMatchObject({ status: 409, code: 'conflict' })
    expect(serializeErr(error)).toMatchObject({ pgCode: '23505' })
  })

  it('maps a missing foreign key to 422 unknown_reference', async () => {
    const error = await violation({ sku: 'FK-TEST', barcode: null, categoryId: 999999 })
    expect(error).toMatchObject({ status: 422, code: 'unknown_reference' })
  })

  it('maps a check violation to 422 validation_error', async () => {
    const error = await violation({ sku: 'CHECK-TEST', barcode: null, priceCents: -1 })
    expect(error).toMatchObject({ status: 422, code: 'validation_error' })
  })

  it('maps invalid input syntax to 400 bad_request', async () => {
    const error = await getDb()
      .execute(sql`select 'abc'::int`)
      .then(
        () => undefined,
        (cause: unknown) => dbError(cause, 'test.repository.cast'),
      )
    expect(error).toMatchObject({ status: 400, code: 'bad_request' })
  })

  // PGlite does not enforce statement_timeout, so Postgres's own 57014 answer is simulated at the
  // driver: the error is wrapped by Drizzle exactly as postgres-js errors are.
  it('maps a statement timeout (57014) to 503 database_unavailable, logs once and keeps serving', async () => {
    const timeout = Object.assign(new Error('canceling statement due to statement timeout'), {
      name: 'PostgresError',
      code: '57014',
    })
    const spy = vi.spyOn(getDb(), 'select').mockImplementation(() => {
      throw new DrizzleQueryError('select "id" from "products"', [], timeout)
    })
    const res = await root.request('/api/products')
    const again = await root.request('/api/products')
    spy.mockRestore()

    expect(res.status).toBe(503)
    expect(await res.json()).toMatchObject({
      code: 'database_unavailable',
      message: expect.stringContaining('try again'),
    })
    expect(again.status).toBe(503)
    expect((await root.request('/api/products')).status).toBe(200)
    expect((await root.request('/api/health')).status).toBe(200)
  })

  it('answers 503 from a real route when the database cannot be reached', async () => {
    const unreachable = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:5432'), {
      code: 'ECONNREFUSED',
    })
    const spy = vi.spyOn(getDb(), 'select').mockImplementation(() => {
      throw unreachable
    })
    const res = await root.request('/api/products')
    spy.mockRestore()
    expect(res.status).toBe(503)
    expect(await res.json()).toMatchObject({ code: 'database_unavailable' })
  })

  it('answers a missing product with 404 and logs layer repository, op and meta.id', async () => {
    const { logger } = await import('../src/utils/logger')
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined)
    const res = await root.request('/api/products/987654', {
      headers: { 'x-request-id': 'miss-1' },
    })
    const entry = warn.mock.calls[0]?.[0] as unknown as Body
    warn.mockRestore()
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({
      code: 'not_found',
      message: 'Product not found',
      requestId: 'miss-1',
    })
    expect(entry).toMatchObject({
      layer: 'repository',
      op: 'catalog.repository.findProductDetail',
      meta: { id: 987654 },
      requestId: 'miss-1',
    })
  })
})

describe('OpenAPI', () => {
  it('documents the standard error responses on the catalog and users routes', async () => {
    const doc = (await (await root.request('/api/openapi.json')).json()) as {
      paths: Record<string, Record<string, { responses: Record<string, unknown> }>>
    }
    const statuses = (path: string, method: string) =>
      Object.keys(doc.paths[path]![method]!.responses)
    expect(statuses('/products', 'get')).toEqual(expect.arrayContaining(['200', '500', '503']))
    expect(statuses('/products/{id}', 'get')).toEqual(expect.arrayContaining(['404', '422', '503']))
    expect(statuses('/users', 'get')).toEqual(expect.arrayContaining(['401', '403', '500', '503']))
  })
})
