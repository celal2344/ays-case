import { useQuery } from '@tanstack/react-query'

import { usersQueryOptions } from '../queries'

/** All users from the API (admin only). */
export function useUsers() {
  const { data, isPending, isError, refetch } = useQuery(usersQueryOptions)
  return { users: data, isPending, isError, refetch }
}
