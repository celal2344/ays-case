import { queryOptions } from '@tanstack/react-query'

import { toAppError } from '@/lib/http-error'

import { getCatalog, getCategories, getProduct } from './api'
import { productKeys } from './query-keys'

// Fresh for a minute: the catalog is read-heavy, and a revisit should not refetch it every time.
const STALE_MS = 60_000

export const catalogQueryOptions = queryOptions({
  queryKey: productKeys.catalog(),
  queryFn: getCatalog,
  staleTime: STALE_MS,
})

export const categoriesQueryOptions = queryOptions({
  queryKey: productKeys.categories(),
  queryFn: getCategories,
  staleTime: STALE_MS,
})

export const productDetailQueryOptions = (id: number) =>
  queryOptions({
    queryKey: productKeys.detail(id),
    queryFn: () => getProduct(id),
    staleTime: STALE_MS,
    // a missing product will not appear on retry
    retry: (failureCount, error) => toAppError(error).kind !== 'not_found' && failureCount < 1,
  })
