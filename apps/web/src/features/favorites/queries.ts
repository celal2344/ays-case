import { queryOptions } from '@tanstack/react-query'

import { getFavorites } from './api'

export const favoriteKeys = { all: ['favorites'] as const }

export const favoritesQueryOptions = queryOptions({
  queryKey: favoriteKeys.all,
  queryFn: getFavorites,
  staleTime: 30_000,
})
