import { GROUP_IDS, groupOf, type GroupId } from '@/features/products/category-groups'
import type { Product } from '@/features/products/schemas'

/** The five hero cards, centre first, then the corners clockwise from the top left. */
export const HERO_IDS = [7, 124, 174, 51, 152] as const

const withImage = (products: Product[]) => products.filter((p) => p.thumbnail !== null)

const byRating = (a: Product, b: Product) =>
  (b.rating ?? 0) - (a.rating ?? 0) || b.reviewCount - a.reviewCount || a.id - b.id

/**
 * The hero's products in slot order. A slot whose product is gone (deleted, or without an image)
 * takes the best rated product of a group the hero does not show yet.
 */
export function heroProducts(products: Product[]): Product[] {
  const usable = withImage(products)
  const byId = new Map(usable.map((p) => [p.id, p]))
  const picked: (Product | undefined)[] = HERO_IDS.map((id) => byId.get(id))
  const usedGroups = new Set(picked.flatMap((p) => (p ? [groupOf(p.category.slug)] : [])))
  const usedIds = new Set(picked.flatMap((p) => (p ? [p.id] : [])))
  const ranked = [...usable].sort(byRating)
  return picked.flatMap((product) => {
    if (product) return [product]
    const next = ranked.find((p) => !usedIds.has(p.id) && !usedGroups.has(groupOf(p.category.slug)))
    if (!next) return []
    usedIds.add(next.id)
    usedGroups.add(groupOf(next.category.slug))
    return [next]
  })
}

/** Biggest discounts first. */
export function dealProducts(products: Product[], count = 6): Product[] {
  return withImage(products)
    .filter((p) => p.discountPercentage > 0)
    .sort((a, b) => b.discountPercentage - a.discountPercentage || byRating(a, b))
    .slice(0, count)
}

/** Best rated with at least three reviews. */
export function topRatedProducts(products: Product[], count = 6): Product[] {
  return withImage(products)
    .filter((p) => p.rating !== null && p.reviewCount >= 3)
    .sort(byRating)
    .slice(0, count)
}

/** Most recently added first. */
export function newestProducts(products: Product[], count = 6): Product[] {
  return withImage(products)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id - b.id)
    .slice(0, count)
}

export interface CategoryTile {
  group: GroupId
  count: number
  /** Up to two product images of the group: a big one and a small one. */
  images: string[]
}

/** One tile per navigation group that has products, in navigation order. */
export function categoryTiles(products: Product[]): CategoryTile[] {
  const usable = withImage(products)
  return GROUP_IDS.flatMap((group) => {
    const inGroup = products.filter((p) => groupOf(p.category.slug) === group)
    if (inGroup.length === 0) return []
    const images = usable
      .filter((p) => groupOf(p.category.slug) === group)
      .sort(byRating)
      .slice(0, 2)
      .flatMap((p) => (p.thumbnail ? [p.thumbnail] : []))
    return [{ group, count: inGroup.length, images }]
  })
}

/** The group's brands with the most products, for a promo headline. */
export function topBrands(products: Product[], group: GroupId, count: number): string[] {
  const tally = new Map<string, number>()
  for (const p of products) {
    if (!p.brand || groupOf(p.category.slug) !== group) continue
    tally.set(p.brand.name, (tally.get(p.brand.name) ?? 0) + 1)
  }
  return [...tally]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, count)
    .map(([name]) => name)
}

/** The group's best rated products that have an image (promo banner cutouts). */
export function groupCutouts(products: Product[], group: GroupId, count = 2): string[] {
  return withImage(products)
    .filter((p) => groupOf(p.category.slug) === group)
    .sort(byRating)
    .slice(0, count)
    .flatMap((p) => (p.thumbnail ? [p.thumbnail] : []))
}

export function catalogStats(products: Product[]) {
  return {
    products: products.length,
    categories: new Set(products.map((p) => p.category.slug)).size,
    brands: new Set(products.flatMap((p) => (p.brand ? [p.brand.name] : []))).size,
  }
}
