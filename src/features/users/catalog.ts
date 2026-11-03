import type { Language } from '@/lib/format'

import type { UserOverlaySnapshot } from './overlay-store'
import type { Role, User } from './schemas'

export function applyUserOverlay(remote: User[], overlay: UserOverlaySnapshot): User[] {
  const hidden = new Set(overlay.deleted)
  const patch = (u: User): User => {
    const changes = overlay.patched[u.id]
    return changes ? { ...u, ...changes } : u
  }
  const local = Object.values(overlay.created)
    .filter((u) => !hidden.has(u.id))
    .map(patch)
    .sort((a, b) => b.id - a.id) // newest local user first
  const merged = remote.filter((u) => !hidden.has(u.id)).map(patch)
  return [...local, ...merged]
}

function normalize(value: string, language: Language) {
  return language === 'tr' ? value.toLocaleLowerCase('tr') : value.toLowerCase()
}

/** Matches name, username and email; `role` narrows to one role. */
export function filterUsers(
  users: User[],
  query: string | undefined,
  role: Role | undefined,
  language: Language,
) {
  const needle = normalize((query ?? '').trim(), language)
  return users.filter((u) => {
    if (role && u.role !== role) return false
    if (!needle) return true
    return [`${u.firstName} ${u.lastName}`, u.username, u.email].some((field) =>
      normalize(field, language).includes(needle),
    )
  })
}

/** Usernames are unique case-insensitively across the merged list (`exceptId` = the user being edited). */
export function isUsernameTaken(users: User[], username: string, exceptId?: number) {
  const wanted = username.trim().toLowerCase()
  return users.some((u) => u.id !== exceptId && u.username.toLowerCase() === wanted)
}
