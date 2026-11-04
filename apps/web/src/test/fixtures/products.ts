import type { Product as ApiProduct, ProductDetail as ApiProductDetail } from '@ays/validators'

import type { Category, Product, ProductDetail } from '@/features/products/schemas'

const CATEGORIES = ['beauty', 'groceries', 'smartphones'] as const

/** 30 deterministic products: ids 1–30, ten per category, prices 10…300. */
export const fixtureProducts: Product[] = Array.from({ length: 30 }, (_, i) => {
  const id = i + 1
  const category = CATEGORIES[i % 3]!
  const stock = id === 3 ? 0 : id === 6 ? 4 : 50
  return {
    id,
    title: `${category} item ${String(id).padStart(2, '0')}`,
    description: `Description of ${category} item ${id}`,
    category,
    price: id * 10,
    discountPercentage: id % 2 === 0 ? 10 : 0,
    // product 7 has no reviews: its rating is null
    rating: id === 7 ? null : 1 + (id % 5),
    reviewCount: id === 7 ? 0 : 1,
    stock,
    brand: id % 4 === 0 ? undefined : `Brand ${id % 3}`,
    thumbnail: `https://cdn.dummyjson.com/product-images/${category}/${id}/thumbnail.webp`,
    availability: stock === 0 ? 'out' : stock <= 5 ? 'low' : 'in',
    minimumOrderQuantity: 1,
    lowStockThreshold: 5,
    tags: [category, id % 2 === 0 ? 'even' : 'odd'],
  }
})

const category = (slug: string, index: number) => ({
  id: index + 1,
  slug,
  name: slug.charAt(0).toUpperCase() + slug.slice(1),
})

const NOW = '2025-04-30T09:41:02.053Z'

/** The API's wire shape of a fixture product (integer cents, nested category and brand). */
export function toWireProduct(p: Product): ApiProduct {
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    category: category(p.category, CATEGORIES.indexOf(p.category as (typeof CATEGORIES)[number])),
    brand: p.brand
      ? { id: 1, slug: p.brand.toLowerCase().replaceAll(' ', '-'), name: p.brand }
      : null,
    priceCents: Math.round(p.price * 100),
    discountPercentage: p.discountPercentage,
    stock: p.stock,
    minimumOrderQuantity: p.minimumOrderQuantity,
    lowStockThreshold: p.lowStockThreshold,
    availability: p.availability,
    tags: p.tags.map((slug) => ({ slug, name: slug })),
    thumbnail: p.thumbnail,
    rating: p.rating,
    reviewCount: p.reviewCount,
    createdAt: NOW,
    updatedAt: NOW,
  }
}

/** The API's wire shape of `GET /products/:id`. Product 7 has no reviews. */
export function fixtureWireDetail(id: number): ApiProductDetail | undefined {
  const product = fixtureProducts.find((p) => p.id === id)
  if (!product) return undefined
  const reviewed = product.reviewCount > 0
  return {
    ...toWireProduct(product),
    sku: `SKU-${id}`,
    barcode: null,
    images: [1, 2, 3].map((n, position) => ({
      url: `https://cdn.dummyjson.com/product-images/${product.category}/${id}/${n}.webp`,
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
      ...(reviewed ? { [String(product.rating)]: 1 } : {}),
    },
    reviews: reviewed
      ? [
          {
            id: id * 1000 + 1,
            rating: product.rating!,
            comment: 'Great!',
            createdAt: NOW,
            updatedAt: NOW,
            author: { id: 'user-5', name: 'Eleanor Collins' },
          },
        ]
      : [],
  }
}

/** The web shape of a fixture product detail, for assertions. */
export function fixtureDetail(id: number): ProductDetail | undefined {
  const product = fixtureProducts.find((p) => p.id === id)
  if (!product) return undefined
  return {
    ...product,
    images: [1, 2, 3].map(
      (n) => `https://cdn.dummyjson.com/product-images/${product.category}/${id}/${n}.webp`,
    ),
    sku: `SKU-${id}`,
    weight: 4,
    dimensions: { width: 15, height: 13, depth: 23 },
    warrantyInformation: '1 week warranty',
    shippingInformation: 'Ships in 1 month',
    returnPolicy: '30 days return policy',
    reviews:
      product.reviewCount > 0
        ? [
            {
              id: id * 1000 + 1,
              rating: product.rating!,
              comment: 'Great!',
              date: NOW,
              reviewerName: 'Eleanor Collins',
            },
          ]
        : [],
    ratingHistogram: {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
      ...(product.rating === null ? {} : { [product.rating]: 1 }),
    },
  }
}

export const fixtureCategories: Category[] = CATEGORIES.map((slug) => ({
  slug,
  name: slug.charAt(0).toUpperCase() + slug.slice(1),
}))

export const fixtureWireCategories = CATEGORIES.map(category)

/** A valid `ProductInput` (no id) for creating overlay products in tests. */
export function productInput(overrides: Partial<Omit<Product, 'id'>> = {}): Omit<Product, 'id'> {
  const { id, ...base } = fixtureProducts[0]!
  void id
  return { ...base, ...overrides }
}
