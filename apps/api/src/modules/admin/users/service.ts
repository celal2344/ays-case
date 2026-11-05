import type { Role, UserCreateBody, UserPatchBody } from '@ays/validators'
import { roleSchema } from '@ays/validators'

import { getAuth } from '../../../auth'
import { getDb } from '../../../db/client'
import { dbError, duplicateField, toConflict } from '../../../utils/db-errors'
import { appError } from '../../../utils/errors'
import * as repository from './repository'

type PublicUser = {
  id: string
  username: string | null
  firstName: string
  lastName: string
  email: string
  role: Role
  image: string | null
}

const toPublic = (row: {
  id: string
  username: string | null
  firstName: string
  lastName: string
  email: string
  role: string | null
  image: string | null
}): PublicUser => ({ ...row, role: roleSchema.catch('user').parse(row.role) })

const duplicate = (op: string, field: string) =>
  appError('duplicate', `A user with this ${field} already exists`, `admin.users.${op}`, {
    field,
  })

const adminCount = () => repository.countAdmins(getDb())

async function find(id: string) {
  const row = await repository.findUser(getDb(), id)
  return row ? toPublic(row) : undefined
}

export async function listUsers(): Promise<PublicUser[]> {
  return (await repository.listUsers(getDb())).map(toPublic)
}

/** Better Auth hashes the initial password and creates the credential account. */
export async function createUser(body: UserCreateBody, headers: Headers): Promise<PublicUser> {
  const username = body.username.toLowerCase()
  try {
    const created = await getAuth().api.createUser({
      headers,
      body: {
        email: body.email.toLowerCase(),
        password: body.password,
        name: `${body.firstName} ${body.lastName}`,
        // the plugin knows user and admin; a moderator is set right after
        role: body.role === 'admin' ? 'admin' : 'user',
        data: {
          username,
          displayUsername: body.username,
          firstName: body.firstName,
          lastName: body.lastName,
          emailVerified: true,
        },
      },
    })
    if (body.role === 'moderator') {
      await repository.setRole(getDb(), created.user.id, 'moderator')
    }
    return (await find(created.user.id))!
  } catch (error) {
    const conflict = toConflict(error)
    if (conflict?.kind === 'duplicate')
      throw duplicate('create', duplicateField(conflict.constraint))
    const message = error instanceof Error ? error.message.toLowerCase() : ''
    if (message.includes('already exists') || message.includes('already taken')) {
      throw duplicate('create', message.includes('username') ? 'username' : 'email')
    }
    throw dbError(error, 'admin.users.create')
  }
}

export async function updateUser(
  id: string,
  patch: UserPatchBody,
  actorId: string,
): Promise<PublicUser> {
  const current = await find(id)
  if (!current) throw appError('not_found', 'User not found', 'admin.users.update', { id })

  const demoting = patch.role !== undefined && current.role === 'admin' && patch.role !== 'admin'
  if (demoting && id === actorId) {
    throw appError(
      'cannot_demote_self',
      'You cannot take admin rights away from yourself',
      'admin.users.update',
      { id },
    )
  }
  if (demoting && (await adminCount()) <= 1) {
    throw appError('last_admin', 'The last admin cannot be demoted', 'admin.users.update', { id })
  }

  const set = {
    ...(patch.username === undefined
      ? {}
      : { username: patch.username.toLowerCase(), displayUsername: patch.username }),
    ...(patch.firstName === undefined ? {} : { firstName: patch.firstName }),
    ...(patch.lastName === undefined ? {} : { lastName: patch.lastName }),
    ...(patch.email === undefined ? {} : { email: patch.email.toLowerCase() }),
    ...(patch.role === undefined ? {} : { role: patch.role }),
  }
  const names = {
    firstName: patch.firstName ?? current.firstName,
    lastName: patch.lastName ?? current.lastName,
  }
  try {
    await getDb().transaction(async (tx) => {
      if (Object.keys(set).length > 0) {
        await repository.updateUser(tx, id, {
          ...set,
          name: `${names.firstName} ${names.lastName}`,
        })
      }
      // a demoted user must sign in again: their old sessions stop working
      if (demoting) await repository.deleteSessions(tx, id)
    })
  } catch (error) {
    const conflict = toConflict(error)
    if (conflict?.kind === 'duplicate')
      throw duplicate('update', duplicateField(conflict.constraint))
    throw dbError(error, 'admin.users.update', { id })
  }
  return (await find(id))!
}

/** Sessions, accounts, carts, favorites, orders and reviews of the user go with it (cascading keys). */
export async function deleteUser(id: string, actorId: string): Promise<void> {
  const current = await find(id)
  if (!current) throw appError('not_found', 'User not found', 'admin.users.delete', { id })
  if (id === actorId) {
    throw appError(
      'cannot_delete_self',
      'You cannot delete your own account',
      'admin.users.delete',
      { id },
    )
  }
  if (current.role === 'admin' && (await adminCount()) <= 1) {
    throw appError('last_admin', 'The last admin cannot be deleted', 'admin.users.delete', { id })
  }
  await repository.deleteUser(getDb(), id)
}
