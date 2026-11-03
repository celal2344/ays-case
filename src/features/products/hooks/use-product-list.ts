import { useMemo } from 'react'

import { selectLanguage, usePreferencesStore } from '@/preferences/store'

import { filterByCategory, filterByQuery, paginate, SHOP_PAGE_SIZE, sortProducts } from '../catalog'
import type { ProductSearch } from '../schemas'
import { useCatalog } from './use-catalog'

/** applyOverlay (inside useCatalog) → query → category → sort → paginate. */
export function useProductList(search: ProductSearch) {
  const { products, ...query } = useCatalog()
  const language = usePreferencesStore(selectLanguage)

  const filtered = useMemo(() => {
    if (!products) return undefined
    const matched = filterByCategory(filterByQuery(products, search.q, language), search.category)
    return sortProducts(matched, search.sort, search.order, language)
  }, [products, search.q, search.category, search.sort, search.order, language])

  const page = useMemo(
    () => (filtered ? paginate(filtered, search.page ?? 1, SHOP_PAGE_SIZE) : undefined),
    [filtered, search.page],
  )

  return { ...query, page, hasProducts: (products?.length ?? 0) > 0 }
}
