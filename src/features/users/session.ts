import type { User } from '@/features/auth/schemas'

import { useUserOverlayStore } from './overlay-store'

/**
 * Applies the admin overlay to the account that just signed in (or whose session was restored):
 * edits made in the Users panel take effect on this browser, and a user deleted there cannot sign in.
 * Returns null for a deleted user.
 */
export function resolveSessionUser(user: User): User | null {
  const { patched, deleted } = useUserOverlayStore.getState()
  if (deleted.includes(user.id)) return null
  const patch = patched[user.id]
  return patch ? { ...user, ...patch } : user
}
