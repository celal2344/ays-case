import type { Language } from '@/lib/format'

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

function normalize(value: string, language: Language) {
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
