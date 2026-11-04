import type { Language } from '@/lib/format'

import { groupOf, type GroupId } from './category-groups'
import { salePriceCents } from '@ays/validators'
import type { Product, ProductSort, SortOrder } from './schemas'

export const SHOP_PAGE_SIZE = 12

export function normalize(value: string, language: Language) {
  // Turkish-safe lowercasing only when the UI language is Turkish (dotted/dotless i).
  return language === 'tr' ? value.toLocaleLowerCase('tr') : value.toLowerCase()
}

export function filterByQuery<T extends Product>(
  products: T[],
  query: string | undefined,
  language: Language,
): T[] {
  const needle = normalize((query ?? '').trim(), language)
  if (!needle) return products
  return products.filter((p) =>
    [
      p.title,
      p.brand?.name ?? '',
      p.category.name,
      p.category.slug,
      ...p.tags.map((t) => t.slug),
    ].some((field) => normalize(field, language).includes(needle)),
  )
}

export function filterByCategory<T extends Product>(
  products: T[],
  category: string | undefined,
): T[] {
  return category ? products.filter((p) => p.category.slug === category) : products
}

export function sortProducts(
  products: Product[],
  sort: ProductSort | undefined,
  order: SortOrder = 'asc',
  language: Language = 'en',
) {
  if (!sort) return products
  const direction = order === 'desc' ? -1 : 1
  const locale = language === 'tr' ? 'tr' : 'en'
  return [...products].sort((a, b) => {
    if (sort === 'rating') {
      // unreviewed products have no rating: they go last in either direction
      if (a.rating === null || b.rating === null) {
        return a.rating === b.rating ? 0 : a.rating === null ? 1 : -1
      }
      return (a.rating - b.rating) * direction
    }
    const result =
      sort === 'title' ? a.title.localeCompare(b.title, locale) : a.priceCents - b.priceCents
    return result * direction
  })
}

export interface Page<T> {
  items: T[]
  total: number
  page: number
  pageCount: number
  from: number
  to: number
}

/** `page` is clamped into range so a stale URL (`?page=99`) shows the last page. */
export function paginate<T>(items: T[], page: number, pageSize: number): Page<T> {
  const total = items.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const current = Math.min(Math.max(1, Math.trunc(page) || 1), pageCount)
  const start = (current - 1) * pageSize
  const slice = items.slice(start, start + pageSize)
  return {
    items: slice,
    total,
    page: current,
    pageCount,
    from: total === 0 ? 0 : start + 1,
    to: start + slice.length,
  }
}

/** Keeps products whose sale price (in dollars, as typed in the filter) is within the bounds. */
export function filterByPrice(
  products: Product[],
  min: number | undefined,
  max: number | undefined,
) {
  if (min === undefined && max === undefined) return products
  return products.filter((p) => {
    const price = salePriceCents(p) / 100
    return (min === undefined || price >= min) && (max === undefined || price <= max)
  })
}

export function filterByBrand(products: Product[], brand: string | undefined) {
  return brand ? products.filter((p) => p.brand?.name === brand) : products
}

export function filterByMinRating(products: Product[], rating: number | undefined) {
  return rating ? products.filter((p) => (p.rating ?? 0) >= rating) : products
}

/** Distinct brands, alphabetical, for the filter panel. */
export function brandsOf(products: Product[]): string[] {
  return [...new Set(products.flatMap((p) => (p.brand ? [p.brand.name] : [])))].sort((a, b) =>
    a.localeCompare(b),
  )
}

/** Products whose category belongs to a navigation group. */
export function filterByGroup(products: Product[], group: GroupId | undefined) {
  return group ? products.filter((p) => groupOf(p.category.slug) === group) : products
}
