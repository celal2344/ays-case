import type { User } from '@/features/auth/schemas'

/** 25 users: ids 1–2 are admins (emilys, michaelw), the rest are plain users; averyp is id 16. */
export const fixtureUserList: User[] = Array.from({ length: 25 }, (_, i) => {
  const id = i + 1
  const named: Record<number, { username: string; firstName: string; lastName: string }> = {
    1: { username: 'emilys', firstName: 'Emily', lastName: 'Johnson' },
    2: { username: 'michaelw', firstName: 'Michael', lastName: 'Williams' },
    16: { username: 'averyp', firstName: 'Avery', lastName: 'Perez' },
  }
  const { username, firstName, lastName } = named[id] ?? {
    username: `user${String(id).padStart(2, '0')}`,
    firstName: `First${id}`,
    lastName: `Last${id}`,
  }
  return {
    id,
    username,
    firstName,
    lastName,
    email: `${username}@x.dummyjson.com`,
    image: `https://dummyjson.com/icon/${username}/128`,
    role: id <= 2 ? 'admin' : 'user',
  }
})
