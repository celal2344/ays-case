import { queryOptions } from '@tanstack/react-query'

import { toAppError } from '@/lib/http-error'

import { getCatalog, getCategories, getProduct } from './api'
import { productKeys } from './query-keys'

// The remote data never changes during a session (DummyJSON persists nothing), so it is cached forever.
export const catalogQueryOptions = queryOptions({
  queryKey: productKeys.catalog(),
  queryFn: getCatalog,
  staleTime: Infinity,
})

export const categoriesQueryOptions = queryOptions({
  queryKey: productKeys.categories(),
  queryFn: getCategories,
  staleTime: Infinity,
})

export const productDetailQueryOptions = (id: number) =>
  queryOptions({
    queryKey: productKeys.detail(id),
    queryFn: () => getProduct(id),
    staleTime: Infinity,
    // a missing product will not appear on retry
    retry: (failureCount, error) => toAppError(error).kind !== 'not_found' && failureCount < 1,
  })
