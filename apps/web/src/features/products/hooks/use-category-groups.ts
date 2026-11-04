import { useMemo } from 'react'

import { groupCategories } from '../category-groups'
import { useCatalog } from './use-catalog'
import { useCategories } from './use-categories'

/** Navigation groups with live counts: admin-added and deleted products are reflected. */
export function useCategoryGroups() {
  const { categories } = useCategories()
  const { products } = useCatalog()
  return useMemo(
    () => (categories && products ? groupCategories(categories, products) : []),
    [categories, products],
  )
}
