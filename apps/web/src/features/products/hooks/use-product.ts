import { useQuery } from '@tanstack/react-query'

import { toAppError } from '@/lib/http-error'

import { productDetailQueryOptions } from '../queries'

/** One product for the detail page: images, reviews, specs and policies, straight from the API. */
export function useProduct(id: number) {
  const query = useQuery(productDetailQueryOptions(id))
  return {
    product: query.data,
    notFound: query.isError && toAppError(query.error).kind === 'not_found',
    isPending: query.isPending,
    query,
  }
}
