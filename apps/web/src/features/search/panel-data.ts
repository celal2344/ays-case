import type { Category, Product } from '@/features/products/schemas'

/**
 * The most frequent product tags in the catalog (skipping tags that are just a category), most
 * frequent first, ties alphabetical. Honest label: "suggested", not "popular" - it is derived from data.
 */
export function getSuggestedTags(
  products: readonly Product[],
  categories: readonly Category[],
  limit: number,
): string[] {
  const skip = new Set(
    categories.flatMap((c) => [c.slug, c.name.toLowerCase()]).map((v) => v.toLowerCase()),
  )
  const counts = new Map<string, number>()
  for (const product of products) {
    for (const tag of new Set(product.tags.map((t) => t.slug.trim().toLowerCase()))) {
      if (tag && !skip.has(tag)) counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([tag]) => tag)
}

/** In-stock products with the highest discount; ties by rating, then id for a stable order. */
export function getBestDeals(products: readonly Product[], limit: number): Product[] {
  return products
    .filter((p) => p.stock > 0 && p.discountPercentage > 0)
    .sort(
      (a, b) =>
        b.discountPercentage - a.discountPercentage ||
        (b.rating ?? 0) - (a.rating ?? 0) ||
        a.id - b.id,
    )
    .slice(0, limit)
}
