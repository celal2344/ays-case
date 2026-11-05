import { describe, expect, it } from 'vitest'

import { LIMITS, registerSchema, roleSchema } from '../src/index.js'

const valid = {
  firstName: 'Celal',
  lastName: 'Özdemir',
  username: 'celal.ozdemir_1',
  email: 'celal@example.com',
  password: 'a-long-password',
  passwordConfirm: 'a-long-password',
}

const fails = (patch: Record<string, string>) =>
  !registerSchema.safeParse({ ...valid, ...patch }).success

describe('registerSchema', () => {
  it('accepts a complete, matching registration', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true)
  })

  it('uses the same limits as the admin forms', () => {
    expect(fails({ username: 'ab' })).toBe(true)
    expect(fails({ username: 'a'.repeat(LIMITS.username.max + 1) })).toBe(true)
    expect(fails({ username: 'has space' })).toBe(true)
    expect(fails({ username: 'ünïcode' })).toBe(true)
    expect(fails({ password: 'short', passwordConfirm: 'short' })).toBe(true)
    expect(fails({ password: 'x'.repeat(73), passwordConfirm: 'x'.repeat(73) })).toBe(true)
    expect(fails({ email: 'not-an-email' })).toBe(true)
    expect(fails({ firstName: '' })).toBe(true)
  })

  it('reports a mismatch on the confirmation field', () => {
    const result = registerSchema.safeParse({ ...valid, passwordConfirm: 'different-password' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['passwordConfirm'])
  })
})

describe('roles', () => {
  it('are admin and user only', () => {
    expect(roleSchema.options).toEqual(['admin', 'user'])
    expect(roleSchema.safeParse('boss').success).toBe(false)
  })
})
