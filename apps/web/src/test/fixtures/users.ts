import type { User } from '@/features/auth/schemas'

/** 25 users: user-1 and user-2 are admins (emilys, michaelw), the rest plain users; averyp is user-16. */
export const fixtureUserList: User[] = Array.from({ length: 25 }, (_, i) => {
  const n = i + 1
  const named: Record<number, { username: string; firstName: string; lastName: string }> = {
    1: { username: 'emilys', firstName: 'Emily', lastName: 'Johnson' },
    2: { username: 'michaelw', firstName: 'Michael', lastName: 'Williams' },
    16: { username: 'averyp', firstName: 'Avery', lastName: 'Perez' },
  }
  const { username, firstName, lastName } = named[n] ?? {
    username: `user${String(n).padStart(2, '0')}`,
    firstName: `First${n}`,
    lastName: `Last${n}`,
  }
  return {
    id: `user-${n}`,
    username,
    firstName,
    lastName,
    email: `${username}@example.com`,
    image: null,
    role: n <= 2 ? 'admin' : 'user',
  }
})
