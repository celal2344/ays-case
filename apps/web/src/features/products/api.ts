import type {
  Product as ApiProduct,
  ProductDetail as ApiProductDetail,
  Review as ApiReview,
} from '@ays/validators'

import { api, call } from '@/lib/api'

import type { Category, Product, ProductDetail, RatingHistogram, Review } from './schemas'

function toProduct(p: ApiProduct): Product {
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    category: p.category.slug,
    price: p.priceCents / 100,
    discountPercentage: p.discountPercentage,
    rating: p.rating,
    reviewCount: p.reviewCount,
    stock: p.stock,
    ...(p.brand ? { brand: p.brand.name } : {}),
    thumbnail: p.thumbnail ?? '',
    availability: p.availability,
    minimumOrderQuantity: p.minimumOrderQuantity,
    lowStockThreshold: p.lowStockThreshold,
    tags: p.tags.map((t) => t.slug),
  }
}

const toReview = (r: ApiReview): Review => ({
  id: r.id,
  rating: r.rating,
  comment: r.comment,
  date: r.createdAt,
  reviewerName: r.author.name,
})

/** Unit conversion for display only: grams to kilograms, millimetres to centimetres. */
function toDetail(p: ApiProductDetail): ProductDetail {
  const { widthMm, heightMm, depthMm, weightG } = p
  const histogram: RatingHistogram = {
    1: p.ratingHistogram['1'],
    2: p.ratingHistogram['2'],
    3: p.ratingHistogram['3'],
    4: p.ratingHistogram['4'],
    5: p.ratingHistogram['5'],
  }
  return {
    ...toProduct(p),
    images: p.images.toSorted((a, b) => a.position - b.position).map((i) => i.url),
    sku: p.sku,
    ...(weightG === null ? {} : { weight: weightG / 1000 }),
    ...(widthMm === null || heightMm === null || depthMm === null
      ? {}
      : { dimensions: { width: widthMm / 10, height: heightMm / 10, depth: depthMm / 10 } }),
    ...(p.warranty ? { warrantyInformation: p.warranty.label } : {}),
    ...(p.shipping ? { shippingInformation: p.shipping.label } : {}),
    ...(p.returnPolicy ? { returnPolicy: p.returnPolicy.label } : {}),
    reviews: p.reviews.map(toReview),
    ratingHistogram: histogram,
  }
}

/** The whole catalog in one request (ADR-0004): search, filter, sort and paging run client-side. */
export async function getCatalog(): Promise<Product[]> {
  const { data } = await call(api.products.$get())
  return data.map(toProduct)
}

export async function getProduct(id: number): Promise<ProductDetail> {
  const { data } = await call(api.products[':id'].$get({ param: { id: String(id) } }))
  return toDetail(data)
}

export async function getCategories(): Promise<Category[]> {
  const { data } = await call(api.categories.$get())
  return data.map(({ slug, name }) => ({ slug, name }))
}
