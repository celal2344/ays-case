import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { categoriesQueryOptions } from '../queries'
import type { Category } from '../schemas'
import { useCatalog } from './use-catalog'

function titleCase(slug: string) {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/** Remote categories plus any category that only exists on admin-created products. */
export function useCategories() {
  const { data, isPending, isError } = useQuery(categoriesQueryOptions)
  const { products } = useCatalog()

  const categories = useMemo<Category[] | undefined>(() => {
    if (!data) return undefined
    const known = new Set(data.map((c) => c.slug))
    const extra = [...new Set((products ?? []).map((p) => p.category))]
      .filter((slug) => !known.has(slug))
      .map((slug) => ({ slug, name: titleCase(slug), url: '' }))
    return [...data, ...extra].sort((a, b) => a.name.localeCompare(b.name))
  }, [data, products])

  return { categories, isPending, isError }
}
