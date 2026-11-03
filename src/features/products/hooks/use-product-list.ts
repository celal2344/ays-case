import { useMemo } from 'react'

import { selectLanguage, usePreferencesStore } from '@/preferences/store'

import {
  brandsOf,
  filterByBrand,
  filterByCategory,
  filterByMinRating,
  filterByPrice,
  filterByQuery,
  paginate,
  SHOP_PAGE_SIZE,
  sortProducts,
} from '../catalog'
import type { ProductSearch } from '../schemas'
import { useCatalog } from './use-catalog'

/** applyOverlay (inside useCatalog) → query → category → price → brand → rating → sort → paginate. */
export function useProductList(search: ProductSearch) {
  const { products, ...query } = useCatalog()
  const language = usePreferencesStore(selectLanguage)
  const { q, category, minPrice, maxPrice, brand, rating, sort, order } = search

  // brands offered in the panel: those of the current search and category, so every choice has results
  const brands = useMemo(
    () =>
      products ? brandsOf(filterByCategory(filterByQuery(products, q, language), category)) : [],
    [products, q, category, language],
  )

  const filtered = useMemo(() => {
    if (!products) return undefined
    let matched = filterByCategory(filterByQuery(products, q, language), category)
    matched = filterByPrice(matched, minPrice, maxPrice)
    matched = filterByBrand(matched, brand)
    matched = filterByMinRating(matched, rating)
    return sortProducts(matched, sort, order, language)
  }, [products, q, category, minPrice, maxPrice, brand, rating, sort, order, language])

  const page = useMemo(
    () => (filtered ? paginate(filtered, search.page ?? 1, SHOP_PAGE_SIZE) : undefined),
    [filtered, search.page],
  )

  return { ...query, page, brands, hasProducts: (products?.length ?? 0) > 0 }
}
