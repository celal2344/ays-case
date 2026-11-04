import { queryOptions } from '@tanstack/react-query'

import { toAppError } from '@/lib/http-error'

import { getOrder, getOrders } from './api'

export const orderKeys = {
  all: ['orders'] as const,
  detail: (id: string) => [...orderKeys.all, id] as const,
}

export const ordersQueryOptions = queryOptions({
  queryKey: orderKeys.all,
  queryFn: getOrders,
  staleTime: 30_000,
})

export const orderQueryOptions = (id: string) =>
  queryOptions({
    queryKey: orderKeys.detail(id),
    queryFn: () => getOrder(id),
    staleTime: 30_000,
    // someone else's order and a missing one both answer 404: retrying will not change that
    retry: (failureCount, error) => toAppError(error).kind !== 'not_found' && failureCount < 1,
  })
