import type { Product, ProductDetail } from '@ays/validators'

import { getDb } from '../../db/client'
import {
  findCategories,
  findImages,
  findProductDetail,
  findProducts,
  findReviews,
  findTags,
} from './repository'

type Row = Awaited<ReturnType<typeof findProducts>>[number]

// Only reshaping happens here: grouping rows and naming fields. Every number comes from SQL.
function toProduct(row: Row, tags: { slug: string; name: string }[]): Product {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: { id: row.categoryId, slug: row.categorySlug, name: row.categoryName },
    brand:
      row.brandId === null || row.brandSlug === null || row.brandName === null
        ? null
        : { id: row.brandId, slug: row.brandSlug, name: row.brandName },
    priceCents: row.priceCents,
    discountPercentage: row.discountPercentage,
    stock: row.stock,
    minimumOrderQuantity: row.minimumOrderQuantity,
    lowStockThreshold: row.lowStockThreshold,
    availability: row.availability,
    tags,
    thumbnail: row.thumbnail,
    rating: row.rating,
    reviewCount: row.reviewCount ?? 0,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export async function listProducts(): Promise<Product[]> {
  const db = getDb()
  const [rows, tagRows] = await Promise.all([findProducts(db), findTags(db)])
  const tagsByProduct = Map.groupBy(tagRows, (tag) => tag.productId)
  return rows.map((row) =>
    toProduct(
      row,
      (tagsByProduct.get(row.id) ?? []).map(({ slug, name }) => ({ slug, name })),
    ),
  )
}

export async function getProduct(id: number): Promise<ProductDetail | undefined> {
  const db = getDb()
  const row = await findProductDetail(db, id)
  if (!row) return undefined
  const [tagRows, images, reviewRows] = await Promise.all([
    findTags(db, [id]),
    findImages(db, id),
    findReviews(db, id),
  ])
  const policy = (policyId: number | null, label: string | null) =>
    policyId === null || label === null ? null : { id: policyId, label }
  return {
    ...toProduct(
      row,
      tagRows.map(({ slug, name }) => ({ slug, name })),
    ),
    sku: row.sku,
    barcode: row.barcode,
    images,
    weightG: row.weightG,
    widthMm: row.widthMm,
    heightMm: row.heightMm,
    depthMm: row.depthMm,
    warranty: policy(row.warrantyId, row.warrantyLabel),
    shipping: policy(row.shippingId, row.shippingLabel),
    returnPolicy: policy(row.returnId, row.returnLabel),
    ratingHistogram: {
      '1': row.rating1 ?? 0,
      '2': row.rating2 ?? 0,
      '3': row.rating3 ?? 0,
      '4': row.rating4 ?? 0,
      '5': row.rating5 ?? 0,
    },
    reviews: reviewRows.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
      author: { id: review.authorId, name: review.authorName },
    })),
  }
}

export function listCategories() {
  return findCategories(getDb())
}
