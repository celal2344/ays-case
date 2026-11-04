import type { User } from '@/features/auth/schemas'

import { useUserOverlayStore } from './overlay-store'

/**
 * Applies the admin overlay to the account that just signed in (or whose session was restored):
 * edits made in the Users panel change how the account is shown (name, email), and a user deleted
 * there cannot sign in. The role and id always come from the server's session: the overlay is
 * display-only for them, so the UI never shows admin pages to someone the API calls a user.
 * Returns null for a deleted user.
 */
export function resolveSessionUser(user: User): User | null {
  const { patched, deleted } = useUserOverlayStore.getState()
  if (deleted.includes(user.id)) return null
  const patch = patched[user.id]
  return patch ? { ...user, ...patch, id: user.id, role: user.role } : user
}
