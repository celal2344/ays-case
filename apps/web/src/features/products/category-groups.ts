import type { Category, Product } from './schemas'

export const GROUP_IDS = [
  'electronics',
  'women',
  'men',
  'home',
  'beauty',
  'groceries',
  'sports',
  'other',
] as const
export type GroupId = (typeof GROUP_IDS)[number]

// The API returns categories as a flat list; this is the navigation's own grouping of them.
const GROUP_OF: Record<string, Exclude<GroupId, 'other'>> = {
  laptops: 'electronics',
  smartphones: 'electronics',
  tablets: 'electronics',
  'mobile-accessories': 'electronics',
  tops: 'women',
  'womens-dresses': 'women',
  'womens-bags': 'women',
  'womens-jewellery': 'women',
  'womens-shoes': 'women',
  'womens-watches': 'women',
  'mens-shirts': 'men',
  'mens-shoes': 'men',
  'mens-watches': 'men',
  sunglasses: 'men',
  furniture: 'home',
  'home-decoration': 'home',
  'kitchen-accessories': 'home',
  beauty: 'beauty',
  fragrances: 'beauty',
  'skin-care': 'beauty',
  groceries: 'groceries',
  'sports-accessories': 'sports',
  motorcycle: 'sports',
  vehicle: 'sports',
}

/** Categories that are not in the map (an admin made one) end up in "other", never unreachable. */
export const groupOf = (slug: string): GroupId => GROUP_OF[slug] ?? 'other'

export interface GroupedCategory {
  slug: string
  name: string
  count: number
}

export interface CategoryGroup {
  id: GroupId
  categories: GroupedCategory[]
  count: number
}

/**
 * Groups categories for the navigation, in `GROUP_IDS` order. Counts come from the (merged) product
 * list; a category without products and a group without categories are left out.
 */
export function groupCategories(
  categories: Category[],
  products: Pick<Product, 'category'>[],
): CategoryGroup[] {
  const counts = new Map<string, number>()
  for (const { category } of products) {
    counts.set(category.slug, (counts.get(category.slug) ?? 0) + 1)
  }

  const groups = new Map<GroupId, GroupedCategory[]>()
  for (const { slug, name } of categories) {
    const count = counts.get(slug) ?? 0
    if (count === 0) continue
    const id = groupOf(slug)
    groups.set(id, [...(groups.get(id) ?? []), { slug, name, count }])
  }

  return GROUP_IDS.flatMap((id) => {
    const list = groups.get(id)
    if (!list) return []
    list.sort((a, b) => a.name.localeCompare(b.name))
    return [{ id, categories: list, count: list.reduce((sum, c) => sum + c.count, 0) }]
  })
}
