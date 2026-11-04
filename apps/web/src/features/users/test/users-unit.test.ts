import { describe, expect, it } from 'vitest'

import { fixtureUserList } from '@/test/fixtures/users'

import { filterUsers, isUsernameTaken } from '../catalog'
import {
  emptyUserForm,
  toUserInput,
  toUserPatch,
  userFormSchema,
  userSearchSchema,
} from '../schemas'

const ids = (users: { id: string }[]) => users.map((u) => u.id)

describe('filterUsers', () => {
  it('matches name, username and email case-insensitively', () => {
    expect(ids(filterUsers(fixtureUserList, 'EMILY', undefined, 'en'))).toEqual(['user-1'])
    expect(ids(filterUsers(fixtureUserList, 'michaelw', undefined, 'en'))).toEqual(['user-2'])
    expect(ids(filterUsers(fixtureUserList, 'perez', undefined, 'en'))).toEqual(['user-16'])
    expect(filterUsers(fixtureUserList, 'example.com', undefined, 'en')).toHaveLength(25)
  })

  it('filters by role and combines with the query', () => {
    expect(filterUsers(fixtureUserList, '', 'admin', 'en')).toHaveLength(2)
    expect(filterUsers(fixtureUserList, 'emily', 'user', 'en')).toHaveLength(0)
    expect(filterUsers(fixtureUserList, undefined, undefined, 'en')).toHaveLength(25)
  })
})

describe('isUsernameTaken', () => {
  it('compares case-insensitively and can ignore the user being edited', () => {
    expect(isUsernameTaken(fixtureUserList, 'EmilyS')).toBe(true)
    expect(isUsernameTaken(fixtureUserList, '  emilys  ')).toBe(true)
    expect(isUsernameTaken(fixtureUserList, 'emilys', 'user-1')).toBe(false)
    expect(isUsernameTaken(fixtureUserList, 'nobody')).toBe(false)
  })
})

describe('user form schema', () => {
  const valid = {
    username: 'newbie',
    firstName: 'New',
    lastName: 'Bie',
    email: 'n@x.com',
    role: 'user' as const,
    password: '',
  }
  const issues = (values: object) => {
    const result = userFormSchema.safeParse({ ...valid, ...values })
    return result.success ? [] : result.error.issues.map((i) => i.path.join('.'))
  }

  it('accepts a valid user and rejects the empty form', () => {
    expect(userFormSchema.safeParse(valid).success).toBe(true)
    expect(issues(emptyUserForm).sort()).toEqual(['email', 'firstName', 'lastName', 'username'])
  })

  it('checks lengths, email format and role', () => {
    expect(issues({ username: 'ab' })).toEqual(['username'])
    expect(issues({ username: 'x'.repeat(31) })).toEqual(['username'])
    expect(issues({ firstName: 'x'.repeat(51) })).toEqual(['firstName'])
    expect(issues({ email: 'nope' })).toEqual(['email'])
    expect(issues({ role: 'superuser' })).toEqual(['role'])
  })

  it('maps form values to a user input (no image) and to a patch', () => {
    expect(toUserInput({ ...valid, username: '  newbie ', password: 'secret-pass' })).toEqual({
      ...valid,
      username: 'newbie',
      password: 'secret-pass',
    })
    const { password, ...patch } = valid
    void password
    expect(toUserPatch(valid)).toEqual(patch)
  })

  it('parses the table URL and ignores junk', () => {
    expect(userSearchSchema.parse({ q: 'a', role: 'admin', page: '2' })).toEqual({
      q: 'a',
      role: 'admin',
      page: 2,
    })
    expect(userSearchSchema.parse({ role: 'boss', page: '0' })).toEqual({})
  })
})
