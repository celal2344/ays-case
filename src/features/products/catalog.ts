import type { Language } from '@/lib/format'

import { groupOf, type GroupId } from './category-groups'
import { salePriceCents } from './pricing'
import type { Product, ProductSort, SortOrder } from './schemas'

/** Admin changes layered over the remote catalog. See docs/data-and-state.md. */
export interface OverlaySnapshot {
  created: Record<number, Product>
  patched: Record<number, Partial<Omit<Product, 'id'>>>
  deleted: number[]
}

export const SHOP_PAGE_SIZE = 12

export function applyOverlay(remote: Product[], overlay: OverlaySnapshot): Product[] {
  const hidden = new Set(overlay.deleted)
  const patch = (p: Product): Product => {
    const changes = overlay.patched[p.id]
    return changes ? { ...p, ...changes } : p
  }
  const local = Object.values(overlay.created)
    .filter((p) => !hidden.has(p.id))
    .map(patch)
    .sort((a, b) => b.id - a.id) // newest local product first
  const merged = remote.filter((p) => !hidden.has(p.id)).map(patch)
  return [...local, ...merged]
}

export function normalize(value: string, language: Language) {
  // Turkish-safe lowercasing only when the UI language is Turkish (dotted/dotless i).
  return language === 'tr' ? value.toLocaleLowerCase('tr') : value.toLowerCase()
}

export function filterByQuery(products: Product[], query: string | undefined, language: Language) {
  const needle = normalize((query ?? '').trim(), language)
  if (!needle) return products
  return products.filter((p) =>
    [p.title, p.brand ?? '', p.category, ...p.tags].some((field) =>
      normalize(field, language).includes(needle),
    ),
  )
}

export function filterByCategory(products: Product[], category: string | undefined) {
  return category ? products.filter((p) => p.category === category) : products
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
    const result = sort === 'title' ? a.title.localeCompare(b.title, locale) : a[sort] - b[sort] // price | rating
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
  return brand ? products.filter((p) => p.brand === brand) : products
}

export function filterByMinRating(products: Product[], rating: number | undefined) {
  return rating ? products.filter((p) => p.rating >= rating) : products
}

/** Distinct brands, alphabetical, for the filter panel. */
export function brandsOf(products: Product[]): string[] {
  return [...new Set(products.flatMap((p) => (p.brand ? [p.brand] : [])))].sort((a, b) =>
    a.localeCompare(b),
  )
}

/** Products whose category belongs to a navigation group. */
export function filterByGroup(products: Product[], group: GroupId | undefined) {
  return group ? products.filter((p) => groupOf(p.category) === group) : products
}
