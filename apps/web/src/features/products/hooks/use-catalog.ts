import { useQuery } from '@tanstack/react-query'

import { catalogQueryOptions } from '../queries'

/**
 * The shop's products, straight from the API. Every list, detail, cart and checkout view reads
 * them through this hook; admin changes reach it by invalidating the catalog query.
 */
export function useCatalog() {
  const { data, isPending, isError, refetch } = useQuery(catalogQueryOptions)
  return { products: data, isPending, isError, refetch }
}
