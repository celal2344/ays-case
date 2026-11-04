import { queryOptions } from '@tanstack/react-query'

import { getCart } from './api'

export const cartKeys = { all: ['cart'] as const }

/** Only fetched for a signed-in user (the hooks pass `enabled`). */
export const cartQueryOptions = queryOptions({
  queryKey: cartKeys.all,
  queryFn: getCart,
  staleTime: 30_000,
})
