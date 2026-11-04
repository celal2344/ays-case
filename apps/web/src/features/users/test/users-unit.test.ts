import { beforeEach, describe, expect, it } from 'vitest'

import { fixtureUserList } from '@/test/fixtures/users'

import { applyUserOverlay, filterUsers, isUsernameTaken } from '../catalog'
import { deleteGuard, demoteGuard } from '../guardrails'
import { FIRST_LOCAL_USER_ID, isLocalUser, useUserOverlayStore } from '../overlay-store'
import {
  emptyUserForm,
  toUserInput,
  toUserPatch,
  userFormSchema,
  userSearchSchema,
} from '../schemas'
import { resolveSessionUser } from '../session'

const none = { created: {}, patched: {}, deleted: [] }
const ids = (users: { id: number }[]) => users.map((u) => u.id)
const input = {
  username: 'newbie',
  firstName: 'New',
  lastName: 'Bie',
  email: 'n@x.com',
  image: '',
  role: 'user' as const,
}

describe('applyUserOverlay', () => {
  it('returns the remote users untouched when the overlay is empty', () => {
    expect(applyUserOverlay(fixtureUserList, none)).toEqual(fixtureUserList)
  })

  it('hides deleted users, applies patches and puts local users first, newest first', () => {
    const merged = applyUserOverlay(fixtureUserList, {
      created: {
        100_000: { ...input, id: 100_000 },
        100_001: { ...input, id: 100_001, username: 'newer' },
      },
      patched: { 3: { role: 'moderator' }, 100_001: { firstName: 'Renamed' } },
      deleted: [4],
    })
    expect(ids(merged).slice(0, 2)).toEqual([100_001, 100_000])
    expect(merged[0]?.firstName).toBe('Renamed')
    expect(merged.find((u) => u.id === 3)?.role).toBe('moderator')
    expect(ids(merged)).not.toContain(4)
  })
})

describe('filterUsers', () => {
  it('matches name, username and email case-insensitively', () => {
    expect(ids(filterUsers(fixtureUserList, 'EMILY', undefined, 'en'))).toEqual([1])
    expect(ids(filterUsers(fixtureUserList, 'michaelw', undefined, 'en'))).toEqual([2])
    expect(ids(filterUsers(fixtureUserList, 'perez', undefined, 'en'))).toEqual([16])
    expect(filterUsers(fixtureUserList, 'x.dummyjson.com', undefined, 'en')).toHaveLength(25)
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
    expect(isUsernameTaken(fixtureUserList, 'emilys', 1)).toBe(false)
    expect(isUsernameTaken(fixtureUserList, 'nobody')).toBe(false)
  })
})

describe('guardrails (USER-5)', () => {
  it('refuses to delete yourself or the last admin', () => {
    expect(deleteGuard(fixtureUserList, 1, 1)).toBe('self')
    expect(deleteGuard(fixtureUserList, 2, 1)).toBeNull() // another admin: fine while two exist
    const oneAdmin = fixtureUserList.map((u) => (u.id === 1 ? { ...u, role: 'user' as const } : u))
    expect(deleteGuard(oneAdmin, 2, 1)).toBe('last-admin')
    expect(deleteGuard(fixtureUserList, 5, 1)).toBeNull()
  })

  it('refuses to demote yourself or the last admin, but allows promoting and keeping admin', () => {
    expect(demoteGuard(fixtureUserList, 1, 'user', 1)).toBe('self')
    expect(demoteGuard(fixtureUserList, 2, 'moderator', 1)).toBeNull()
    const oneAdmin = fixtureUserList.map((u) => (u.id === 1 ? { ...u, role: 'user' as const } : u))
    expect(demoteGuard(oneAdmin, 2, 'user', 1)).toBe('last-admin')
    expect(demoteGuard(fixtureUserList, 1, 'admin', 1)).toBeNull()
    expect(demoteGuard(fixtureUserList, 5, 'admin', 1)).toBeNull() // promoting a user
    expect(demoteGuard(fixtureUserList, 5, 'user', 1)).toBeNull() // not an admin: nothing to lose
  })
})

describe('user overlay store', () => {
  beforeEach(() => useUserOverlayStore.getState().reset())

  it('creates local users with sequential ids from 100000', () => {
    const a = useUserOverlayStore.getState().create(input)
    const b = useUserOverlayStore.getState().create(input)
    expect([a.id, b.id]).toEqual([FIRST_LOCAL_USER_ID, FIRST_LOCAL_USER_ID + 1])
    expect(isLocalUser(a.id)).toBe(true)
    expect(isLocalUser(208)).toBe(false)
  })

  it('updates local users in place and remote ones through patches', () => {
    const local = useUserOverlayStore.getState().create(input)
    useUserOverlayStore.getState().update(local.id, { role: 'admin' })
    useUserOverlayStore.getState().update(7, { firstName: 'Seven' })
    expect(useUserOverlayStore.getState().created[local.id]?.role).toBe('admin')
    expect(useUserOverlayStore.getState().patched[7]).toEqual({ firstName: 'Seven' })
  })

  it('removing hides a remote user and deletes a local one; reset restores everything', () => {
    const local = useUserOverlayStore.getState().create(input)
    useUserOverlayStore.getState().remove(7)
    useUserOverlayStore.getState().remove(local.id)
    expect(useUserOverlayStore.getState().deleted).toEqual([7])
    expect(useUserOverlayStore.getState().created).toEqual({})
    useUserOverlayStore.getState().reset()
    expect(useUserOverlayStore.getState()).toMatchObject({
      deleted: [],
      nextLocalId: FIRST_LOCAL_USER_ID,
    })
  })

  it('persists under the versioned key', () => {
    useUserOverlayStore.getState().update(7, { firstName: 'Seven' })
    const saved = JSON.parse(localStorage.getItem('ays-case:v1:user-overlay') ?? '{}')
    expect(saved.state.patched['7']).toEqual({ firstName: 'Seven' })
    expect(saved.version).toBe(1)
  })
})

describe('resolveSessionUser', () => {
  beforeEach(() => useUserOverlayStore.getState().reset())
  const emily = fixtureUserList[0]!

  it('passes the user through when the overlay has nothing for them', () => {
    expect(resolveSessionUser(emily)).toBe(emily)
  })

  it('applies the overlay patch on top (USER-5)', () => {
    useUserOverlayStore.getState().update(1, { firstName: 'Em', role: 'moderator' })
    expect(resolveSessionUser(emily)).toMatchObject({
      firstName: 'Em',
      role: 'moderator',
      username: 'emilys',
    })
  })

  it('returns null for a user an admin deleted', () => {
    useUserOverlayStore.getState().remove(1)
    expect(resolveSessionUser(emily)).toBeNull()
  })
})

describe('user form schema', () => {
  const valid = {
    username: 'newbie',
    firstName: 'New',
    lastName: 'Bie',
    email: 'n@x.com',
    role: 'user' as const,
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
    expect(toUserInput({ ...valid, username: '  newbie ' })).toEqual({
      ...valid,
      username: 'newbie',
      image: '',
    })
    expect(toUserPatch(valid)).toEqual(valid)
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
