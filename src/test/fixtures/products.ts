import type { Category, Product, ProductDetail } from '@/features/products/schemas'

const CATEGORIES = ['beauty', 'groceries', 'smartphones'] as const

/** 30 deterministic products: ids 1–30, ten per category, prices 10…300. */
export const fixtureProducts: Product[] = Array.from({ length: 30 }, (_, i) => {
  const id = i + 1
  const category = CATEGORIES[i % 3]!
  return {
    id,
    title: `${category} item ${String(id).padStart(2, '0')}`,
    description: `Description of ${category} item ${id}`,
    category,
    price: id * 10,
    discountPercentage: id % 2 === 0 ? 10 : 0,
    rating: 1 + (id % 5),
    stock: id === 3 ? 0 : id === 6 ? 4 : 50,
    brand: id % 4 === 0 ? undefined : `Brand ${id % 3}`,
    thumbnail: `https://cdn.dummyjson.com/product-images/${category}/${id}/thumbnail.webp`,
    availabilityStatus: 'In Stock',
    minimumOrderQuantity: 1,
    tags: [category, id % 2 === 0 ? 'even' : 'odd'],
  }
})

export function fixtureDetail(id: number): ProductDetail | undefined {
  const product = fixtureProducts.find((p) => p.id === id)
  if (!product) return undefined
  return {
    ...product,
    images: [`https://cdn.dummyjson.com/product-images/${product.category}/${id}/1.webp`],
    reviews: [
      {
        rating: 5,
        comment: 'Great!',
        date: '2025-04-30T09:41:02.053Z',
        reviewerName: 'Eleanor Collins',
        reviewerEmail: 'eleanor@x.dummyjson.com',
      },
    ],
  }
}

export const fixtureCategories: Category[] = CATEGORIES.map((slug) => ({
  slug,
  name: slug.charAt(0).toUpperCase() + slug.slice(1),
  url: `https://dummyjson.com/products/category/${slug}`,
}))

/** A valid `ProductInput` (no id) for creating overlay products in tests. */
export function productInput(overrides: Partial<Omit<Product, 'id'>> = {}): Omit<Product, 'id'> {
  const {
    title,
    description,
    category,
    price,
    discountPercentage,
    rating,
    stock,
    thumbnail,
    tags,
  } = fixtureProducts[0]!
  return {
    title,
    description,
    category,
    price,
    discountPercentage,
    rating,
    stock,
    thumbnail,
    tags,
    ...overrides,
  }
}
