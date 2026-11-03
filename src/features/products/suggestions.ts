import type { Language } from '@/lib/format'

import { normalize } from './catalog'
import type { Category, Product } from './schemas'

export const MIN_SUGGESTION_CHARS = 2

export interface Suggestions {
  products: Product[]
  categories: Array<Category & { count: number }>
}

export interface SuggestionLimits {
  products: number
  categories: number
}

export const DEFAULT_LIMITS: SuggestionLimits = { products: 5, categories: 3 }

const EMPTY: Suggestions = { products: [], categories: [] }

/** 0 = title starts with the text, 1 = title contains it, 2 = brand / category / tag matches; -1 = no match. */
function rank(product: Product, needle: string, language: Language) {
  const title = normalize(product.title, language)
  if (title.startsWith(needle)) return 0
  if (title.includes(needle)) return 1
  const others = [product.brand ?? '', product.category, ...product.tags]
  return others.some((field) => normalize(field, language).includes(needle)) ? 2 : -1
}

/**
 * Type-ahead matches from the merged catalog (so edits, deletions and local products apply).
 * Pure; the caller passes the catalog and the category list.
 */
export function getSuggestions(
  products: readonly Product[],
  categories: readonly Category[],
  query: string,
  language: Language,
  limits: SuggestionLimits = DEFAULT_LIMITS,
): Suggestions {
  const needle = normalize(query.trim(), language)
  if (needle.length < MIN_SUGGESTION_CHARS) return EMPTY

  const matched = products
    .map((product, index) => ({ product, index, rank: rank(product, needle, language) }))
    .filter((entry) => entry.rank >= 0)
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .slice(0, limits.products)
    .map((entry) => entry.product)

  const counts = new Map<string, number>()
  for (const product of products)
    counts.set(product.category, (counts.get(product.category) ?? 0) + 1)

  const matchedCategories = categories
    .filter(
      (c) =>
        (counts.get(c.slug) ?? 0) > 0 &&
        (normalize(c.name, language).includes(needle) ||
          normalize(c.slug, language).includes(needle)),
    )
    .map((c) => ({ ...c, count: counts.get(c.slug) ?? 0 }))
    .sort((a, b) => {
      const aStarts = normalize(a.name, language).startsWith(needle) ? 0 : 1
      const bStarts = normalize(b.name, language).startsWith(needle) ? 0 : 1
      return aStarts - bStarts || a.name.localeCompare(b.name)
    })
    .slice(0, limits.categories)

  return { products: matched, categories: matchedCategories }
}
