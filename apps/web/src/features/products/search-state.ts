import type { ProductSearch, ProductSort, SortOrder } from './schemas'

/** Drops everything that equals its default so the URL only carries what differs. */
export function normalizeSearch(search: ProductSearch): ProductSearch {
  const q = search.q?.trim()
  const sort = search.sort
  return {
    q: q ? q : undefined,
    category: search.category || undefined,
    group: search.group,
    sort,
    order: sort && search.order === 'desc' ? 'desc' : undefined,
    page: search.page && search.page > 1 ? search.page : undefined,
    view: search.view,
    minPrice: search.minPrice,
    maxPrice: search.maxPrice,
    brand: search.brand || undefined,
    rating: search.rating,
  }
}

/** The filters shown as removable chips: everything except search text, sort, view and paging. */
export type FilterKey = 'q' | 'category' | 'group' | 'price' | 'brand' | 'rating'

export function activeFilters(search: ProductSearch): FilterKey[] {
  const keys: FilterKey[] = []
  if (search.q?.trim()) keys.push('q')
  if (search.category) keys.push('category')
  if (search.group) keys.push('group')
  if (search.minPrice !== undefined || search.maxPrice !== undefined) keys.push('price')
  if (search.brand) keys.push('brand')
  if (search.rating) keys.push('rating')
  return keys
}

/** The search that removes one filter (or all of them when no key is given). */
export function withoutFilter(key?: FilterKey): Partial<ProductSearch> {
  const all: Record<FilterKey, Partial<ProductSearch>> = {
    q: { q: undefined },
    category: { category: undefined },
    group: { group: undefined },
    price: { minPrice: undefined, maxPrice: undefined },
    brand: { brand: undefined },
    rating: { rating: undefined },
  }
  return key ? all[key] : Object.assign({}, ...Object.values(all))
}

/** Any change to q / category / sort resets paging; a page change keeps everything else. */
export function updateSearch(
  current: ProductSearch,
  change: Partial<ProductSearch>,
): ProductSearch {
  const pageChanged = 'page' in change
  // picking one category replaces a whole-group filter
  const group = 'group' in change ? change.group : 'category' in change ? undefined : current.group
  return normalizeSearch({
    ...current,
    ...change,
    group,
    page: pageChanged ? change.page : undefined,
  })
}

export const SORT_OPTIONS = [
  'default',
  'price-asc',
  'price-desc',
  'rating-desc',
  'discount-desc',
  'newest-desc',
  'title-asc',
  'title-desc',
] as const
export type SortOption = (typeof SORT_OPTIONS)[number]

export function toSortOption(
  sort: ProductSort | undefined,
  order: SortOrder | undefined,
): SortOption {
  if (!sort) return 'default'
  const key = `${sort}-${order ?? 'asc'}`
  return (SORT_OPTIONS as readonly string[]).includes(key) ? (key as SortOption) : 'default'
}

export function fromSortOption(option: SortOption): Pick<ProductSearch, 'sort' | 'order'> {
  if (option === 'default') return { sort: undefined, order: undefined }
  const [sort, order] = option.split('-') as [ProductSort, SortOrder]
  return { sort, order }
}
