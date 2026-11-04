import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { categoriesQueryOptions } from '../queries'

/** The API's categories, alphabetical by name. */
export function useCategories() {
  const { data, isPending, isError } = useQuery(categoriesQueryOptions)
  const categories = useMemo(() => data?.toSorted((a, b) => a.name.localeCompare(b.name)), [data])
  return { categories, isPending, isError }
}
