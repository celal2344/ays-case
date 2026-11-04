import { useQuery } from '@tanstack/react-query'

import { selectUser, useAuthStore } from '@/features/auth/store'
import { toAppError } from '@/lib/http-error'

import { orderQueryOptions, ordersQueryOptions } from '../queries'

/** The signed-in user's orders, newest first, from the server. */
export function useOrders() {
  const signedIn = useAuthStore(selectUser) !== null
  const query = useQuery({ ...ordersQueryOptions, enabled: signedIn })
  return {
    orders: query.data ?? [],
    isPending: query.isPending,
    isError: query.isError,
    refetch: query.refetch,
  }
}

/** One of my orders. `notFound` covers someone else's id too: the API cannot tell them apart. */
export function useOrder(orderId: string) {
  const query = useQuery(orderQueryOptions(orderId))
  return {
    order: query.data,
    isPending: query.isPending,
    notFound: query.isError && toAppError(query.error).kind === 'not_found',
    isError: query.isError,
    refetch: query.refetch,
  }
}
