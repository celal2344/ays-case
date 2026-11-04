import type { Role, User } from './schemas'

/** Why an admin action on a user is refused. */
export type GuardReason = 'self' | 'last-admin'

const adminCount = (users: User[]) => users.filter((u) => u.role === 'admin').length

/** You cannot delete yourself, and the last admin cannot be deleted (it would lock everyone out). */
export function deleteGuard(users: User[], targetId: string, currentUserId: string | undefined) {
  if (targetId === currentUserId) return 'self' satisfies GuardReason
  const target = users.find((u) => u.id === targetId)
  if (target?.role === 'admin' && adminCount(users) <= 1) return 'last-admin' satisfies GuardReason
  return null
}

/** Same rules for taking admin rights away (a role change to anything but `admin`). */
export function demoteGuard(
  users: User[],
  targetId: string,
  newRole: Role,
  currentUserId: string | undefined,
) {
  const target = users.find((u) => u.id === targetId)
  if (target?.role !== 'admin' || newRole === 'admin') return null
  if (targetId === currentUserId) return 'self' satisfies GuardReason
  if (adminCount(users) <= 1) return 'last-admin' satisfies GuardReason
  return null
}
