import { queryOptions } from '@tanstack/react-query'

import { getRecentlyViewed } from './api'

export const recentlyViewedKeys = { all: ['recently-viewed'] as const }

export const recentlyViewedQueryOptions = queryOptions({
  queryKey: recentlyViewedKeys.all,
  queryFn: getRecentlyViewed,
  staleTime: 30_000,
})
