import { api, call } from '@/lib/api'

import type { User } from './schemas'

/** All users in one request (admin only); search, filter and paging run client-side. */
export async function getUsers(): Promise<User[]> {
  const { data } = await call(api.users.$get())
  return data
}
