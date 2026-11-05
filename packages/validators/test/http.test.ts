import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { envelope, errorCodes, errorSchema, paginationQuerySchema } from '../src/index.js'

describe('http schemas', () => {
  it('wraps data in an envelope', () => {
    expect(envelope(z.string()).parse({ data: 'ok' })).toEqual({ data: 'ok' })
    expect(envelope(z.string()).safeParse({ data: 1 }).success).toBe(false)
  })

  it('accepts a code/message error with optional field errors', () => {
    expect(errorSchema.parse({ code: 'not_found', message: 'Nope' })).toEqual({
      code: 'not_found',
      message: 'Nope',
    })
    expect(
      errorSchema.safeParse({
        code: 'validation_error',
        message: 'Invalid',
        errors: [{ field: 'q', message: 'Required' }],
      }).success,
    ).toBe(true)
  })

  it('only accepts codes from the shared list and carries the request id', () => {
    expect(
      errorSchema.parse({ code: 'database_unavailable', message: 'Try again', requestId: 'r1' }),
    ).toEqual({ code: 'database_unavailable', message: 'Try again', requestId: 'r1' })
    expect(errorSchema.safeParse({ code: 'made_up', message: 'x' }).success).toBe(false)
    expect(errorCodes).toContain('database_unavailable')
  })

  it('coerces pagination defaults and bounds', () => {
    expect(paginationQuerySchema.parse({})).toEqual({ page: 1, limit: 20 })
    expect(paginationQuerySchema.parse({ page: '2', limit: '50' })).toEqual({ page: 2, limit: 50 })
    expect(paginationQuerySchema.safeParse({ limit: '1000' }).success).toBe(false)
  })
})
