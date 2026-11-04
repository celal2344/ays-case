import type { Category, Product, ProductDetail } from '@ays/validators'

const CATEGORY_SLUGS = ['beauty', 'groceries', 'smartphones'] as const

/** Three categories, exactly as the API sends them. */
export const fixtureCategories: Category[] = CATEGORY_SLUGS.map((slug, index) => ({
  id: index + 1,
  slug,
  name: slug.charAt(0).toUpperCase() + slug.slice(1),
}))

const NOW = '2025-04-30T09:41:02.053Z'

/** 30 deterministic products: ids 1–30, ten per category, prices $10…$300 (in cents). */
export const fixtureProducts: Product[] = Array.from({ length: 30 }, (_, i) => {
  const id = i + 1
  const category = fixtureCategories[i % 3]!
  const stock = id === 3 ? 0 : id === 6 ? 4 : 50
  const brand =
    id % 4 === 0 ? null : { id: (id % 3) + 1, slug: `brand-${id % 3}`, name: `Brand ${id % 3}` }
  return {
    id,
    title: `${category.slug} item ${String(id).padStart(2, '0')}`,
    description: `Description of ${category.slug} item ${id}`,
    category,
    brand,
    priceCents: id * 1000,
    discountPercentage: id % 2 === 0 ? 10 : 0,
    // product 7 has no reviews: its rating is null
    rating: id === 7 ? null : 1 + (id % 5),
    reviewCount: id === 7 ? 0 : 1,
    stock,
    availability: stock === 0 ? 'out' : stock <= 5 ? 'low' : 'in',
    minimumOrderQuantity: 1,
    lowStockThreshold: 5,
    tags: [category.slug, id % 2 === 0 ? 'even' : 'odd'].map((slug) => ({ slug, name: slug })),
    thumbnail: `https://cdn.dummyjson.com/product-images/${category.slug}/${id}/thumbnail.webp`,
    createdAt: NOW,
    updatedAt: NOW,
  }
})

/** `GET /products/:id` for a fixture product: 3 images, specs in grams and millimetres, one review. */
export function fixtureDetail(id: number): ProductDetail | undefined {
  const product = fixtureProducts.find((p) => p.id === id)
  if (!product) return undefined
  const { rating } = product
  return {
    ...product,
    sku: `SKU-${id}`,
    barcode: null,
    images: [1, 2, 3].map((n, position) => ({
      url: `https://cdn.dummyjson.com/product-images/${product.category.slug}/${id}/${n}.webp`,
      position,
      isPrimary: position === 0,
    })),
    weightG: 4000,
    widthMm: 150,
    heightMm: 130,
    depthMm: 230,
    warranty: { id: 1, label: '1 week warranty' },
    shipping: { id: 1, label: 'Ships in 1 month' },
    returnPolicy: { id: 1, label: '30 days return policy' },
    ratingHistogram: {
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 0,
      ...(rating === null ? {} : { [String(rating)]: 1 }),
    },
    reviews:
      rating !== null
        ? [
            {
              id: id * 1000 + 1,
              rating,
              comment: 'Great!',
              createdAt: NOW,
              updatedAt: NOW,
              author: { id: 'user-5', name: 'Eleanor Collins' },
              verifiedBuyer: false,
            },
          ]
        : [],
  }
}

/** A valid `ProductInput` (no id) for creating overlay products in tests. */
export function productInput(overrides: Partial<Omit<Product, 'id'>> = {}): Omit<Product, 'id'> {
  const { id, ...base } = fixtureProducts[0]!
  void id
  return { ...base, ...overrides }
}

/** Small builders so tests can write `category: cat('beauty')` and `tags: tags('a', 'b')`. */
export const cat = (slug: string, name = slug): Category => ({ id: 0, slug, name })
export const tags = (...slugs: string[]) => slugs.map((slug) => ({ slug, name: slug }))
export const brand = (name: string) => ({ id: 0, slug: name.toLowerCase(), name })
