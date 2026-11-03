import { queryOptions } from '@tanstack/react-query'

import { getUsers } from './api'

export const userKeys = {
  all: ['users'] as const,
  list: () => [...userKeys.all, 'list'] as const,
}

// Remote users never change during a session (DummyJSON persists nothing): cache them forever.
export const usersQueryOptions = queryOptions({
  queryKey: userKeys.list(),
  queryFn: getUsers,
  staleTime: Infinity,
})
