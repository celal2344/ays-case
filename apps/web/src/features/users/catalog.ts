import type { Language } from '@/lib/format'

import type { Role, User } from './schemas'

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
    return [`${u.firstName} ${u.lastName}`, u.username ?? '', u.email].some((field) =>
      normalize(field, language).includes(needle),
    )
  })
}

/** Usernames are unique case-insensitively across the merged list (`exceptId` = the user being edited). */
export function isUsernameTaken(users: User[], username: string, exceptId?: string) {
  const wanted = username.trim().toLowerCase()
  return users.some((u) => u.id !== exceptId && u.username?.toLowerCase() === wanted)
}
