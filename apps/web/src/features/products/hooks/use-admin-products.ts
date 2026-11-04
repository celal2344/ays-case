import { queryOptions, useQuery } from '@tanstack/react-query'

import { getAdminProducts } from '@/features/admin/api'

import { productKeys } from '../query-keys'

export const adminProductsQueryOptions = queryOptions({
  queryKey: productKeys.admin(),
  queryFn: getAdminProducts,
  staleTime: 30_000,
})

/** Every product, soft-deleted ones included (admin only). */
export function useAdminProducts() {
  const { data, isPending, isError, refetch } = useQuery(adminProductsQueryOptions)
  return { products: data, isPending, isError, refetch }
}
