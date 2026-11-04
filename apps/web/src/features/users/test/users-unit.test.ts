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
const ids = (users: { id: string }[]) => users.map((u) => u.id)
const input = {
  username: 'newbie',
  firstName: 'New',
  lastName: 'Bie',
  email: 'n@x.com',
  image: null,
  role: 'user' as const,
}

describe('applyUserOverlay', () => {
  it('returns the remote users untouched when the overlay is empty', () => {
    expect(applyUserOverlay(fixtureUserList, none)).toEqual(fixtureUserList)
  })

  it('hides deleted users, applies patches and puts local users first, newest first', () => {
    const merged = applyUserOverlay(fixtureUserList, {
      created: {
        'local-1': { ...input, id: 'local-1' },
        'local-2': { ...input, id: 'local-2', username: 'newer' },
      },
      patched: { 'user-3': { role: 'moderator' }, 'local-2': { firstName: 'Renamed' } },
      deleted: ['user-4'],
    })
    expect(ids(merged).slice(0, 2)).toEqual(['local-2', 'local-1'])
    expect(merged[0]?.firstName).toBe('Renamed')
    expect(merged.find((u) => u.id === 'user-3')?.role).toBe('moderator')
    expect(ids(merged)).not.toContain('user-4')
  })
})

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

describe('guardrails (USER-5)', () => {
  it('refuses to delete yourself or the last admin', () => {
    expect(deleteGuard(fixtureUserList, 'user-1', 'user-1')).toBe('self')
    expect(deleteGuard(fixtureUserList, 'user-2', 'user-1')).toBeNull() // another admin: fine while two exist
    const oneAdmin = fixtureUserList.map((u) =>
      u.id === 'user-1' ? { ...u, role: 'user' as const } : u,
    )
    expect(deleteGuard(oneAdmin, 'user-2', 'user-1')).toBe('last-admin')
    expect(deleteGuard(fixtureUserList, 'user-5', 'user-1')).toBeNull()
  })

  it('refuses to demote yourself or the last admin, but allows promoting and keeping admin', () => {
    expect(demoteGuard(fixtureUserList, 'user-1', 'user', 'user-1')).toBe('self')
    expect(demoteGuard(fixtureUserList, 'user-2', 'moderator', 'user-1')).toBeNull()
    const oneAdmin = fixtureUserList.map((u) =>
      u.id === 'user-1' ? { ...u, role: 'user' as const } : u,
    )
    expect(demoteGuard(oneAdmin, 'user-2', 'user', 'user-1')).toBe('last-admin')
    expect(demoteGuard(fixtureUserList, 'user-1', 'admin', 'user-1')).toBeNull()
    expect(demoteGuard(fixtureUserList, 'user-5', 'admin', 'user-1')).toBeNull() // promoting a user
    expect(demoteGuard(fixtureUserList, 'user-5', 'user', 'user-1')).toBeNull() // not an admin: nothing to lose
  })
})

describe('user overlay store', () => {
  beforeEach(() => useUserOverlayStore.getState().reset())

  it('creates local users with sequential local- ids', () => {
    const a = useUserOverlayStore.getState().create(input)
    const b = useUserOverlayStore.getState().create(input)
    expect([a.id, b.id]).toEqual(['local-1', 'local-2'])
    expect(isLocalUser(a.id)).toBe(true)
    expect(isLocalUser('user-208')).toBe(false)
  })

  it('updates local users in place and remote ones through patches', () => {
    const local = useUserOverlayStore.getState().create(input)
    useUserOverlayStore.getState().update(local.id, { role: 'admin' })
    useUserOverlayStore.getState().update('user-7', { firstName: 'Seven' })
    expect(useUserOverlayStore.getState().created[local.id]?.role).toBe('admin')
    expect(useUserOverlayStore.getState().patched['user-7']).toEqual({ firstName: 'Seven' })
  })

  it('removing hides a remote user and deletes a local one; reset restores everything', () => {
    const local = useUserOverlayStore.getState().create(input)
    useUserOverlayStore.getState().remove('user-7')
    useUserOverlayStore.getState().remove(local.id)
    expect(useUserOverlayStore.getState().deleted).toEqual(['user-7'])
    expect(useUserOverlayStore.getState().created).toEqual({})
    useUserOverlayStore.getState().reset()
    expect(useUserOverlayStore.getState()).toMatchObject({
      deleted: [],
      nextLocalId: FIRST_LOCAL_USER_ID,
    })
  })

  it('persists under the versioned key', () => {
    useUserOverlayStore.getState().update('user-7', { firstName: 'Seven' })
    const saved = JSON.parse(localStorage.getItem('ays-case:v1:user-overlay') ?? '{}')
    expect(saved.state.patched['user-7']).toEqual({ firstName: 'Seven' })
    expect(saved.version).toBe(1)
  })
})

describe('resolveSessionUser', () => {
  beforeEach(() => useUserOverlayStore.getState().reset())
  const emily = fixtureUserList[0]!

  it('passes the user through when the overlay has nothing for them', () => {
    expect(resolveSessionUser(emily)).toBe(emily)
  })

  it('applies the overlay patch on top, but the session keeps its role and id (USER-5)', () => {
    useUserOverlayStore.getState().update('user-1', { firstName: 'Em', role: 'moderator' })
    expect(resolveSessionUser(emily)).toMatchObject({
      id: 'user-1',
      firstName: 'Em',
      role: 'admin',
      username: 'emilys',
    })
  })

  it('returns null for a user an admin deleted', () => {
    useUserOverlayStore.getState().remove('user-1')
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
      image: null,
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
