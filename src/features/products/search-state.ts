import type { ProductSearch, ProductSort, SortOrder } from './schemas'

/** Drops everything that equals its default so the URL only carries what differs. */
export function normalizeSearch(search: ProductSearch): ProductSearch {
  const q = search.q?.trim()
  const sort = search.sort
  return {
    q: q ? q : undefined,
    category: search.category || undefined,
    sort,
    order: sort && search.order === 'desc' ? 'desc' : undefined,
    page: search.page && search.page > 1 ? search.page : undefined,
    view: search.view,
  }
}

/** Any change to q / category / sort resets paging; a page change keeps everything else. */
export function updateSearch(
  current: ProductSearch,
  change: Partial<ProductSearch>,
): ProductSearch {
  const pageChanged = 'page' in change
  return normalizeSearch({ ...current, ...change, page: pageChanged ? change.page : undefined })
}

export const SORT_OPTIONS = [
  'default',
  'price-asc',
  'price-desc',
  'rating-desc',
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
