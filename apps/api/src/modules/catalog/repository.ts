import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm'

import type { Database } from '../../db/client'
import {
  brands,
  categories,
  productImages,
  productRatingStats,
  products,
  productTags,
  returnPolicies,
  reviews,
  shippingPolicies,
  tags,
  user,
  warrantyPolicies,
} from '../../db/schema'
import { reviewColumns } from '../reviews/repository'

// Ratings, the histogram, availability and numeric casts are all computed here, in SQL.
const baseColumns = {
  id: products.id,
  deletedAt: products.deletedAt,
  title: products.title,
  description: products.description,
  categoryId: categories.id,
  categorySlug: categories.slug,
  categoryName: categories.name,
  brandId: brands.id,
  brandSlug: brands.slug,
  brandName: brands.name,
  priceCents: products.priceCents,
  discountPercentage: sql<number>`${products.discountPercentage}::float8`,
  stock: products.stock,
  minimumOrderQuantity: products.minimumOrderQuantity,
  lowStockThreshold: products.lowStockThreshold,
  availability: sql<'in' | 'low' | 'out'>`case
    when ${products.stock} = 0 then 'out'
    when ${products.stock} <= ${products.lowStockThreshold} then 'low'
    else 'in' end`,
  thumbnail: productImages.url,
  rating: sql<number | null>`${productRatingStats.ratingAvg}::float8`,
  reviewCount: productRatingStats.ratingCount,
  createdAt: products.createdAt,
  updatedAt: products.updatedAt,
}

const notDeleted = isNull(products.deletedAt)

export function findProducts(db: Database, includeDeleted = false) {
  return db
    .select(baseColumns)
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .leftJoin(brands, eq(brands.id, products.brandId))
    .leftJoin(productRatingStats, eq(productRatingStats.productId, products.id))
    .leftJoin(
      productImages,
      and(eq(productImages.productId, products.id), eq(productImages.isPrimary, true)),
    )
    .where(includeDeleted ? undefined : notDeleted)
    .orderBy(asc(products.id))
}

export async function findProductDetail(db: Database, id: number, includeDeleted = false) {
  const [row] = await db
    .select({
      ...baseColumns,
      sku: products.sku,
      barcode: products.barcode,
      weightG: products.weightG,
      widthMm: products.widthMm,
      heightMm: products.heightMm,
      depthMm: products.depthMm,
      warrantyId: warrantyPolicies.id,
      warrantyLabel: warrantyPolicies.label,
      shippingId: shippingPolicies.id,
      shippingLabel: shippingPolicies.label,
      returnId: returnPolicies.id,
      returnLabel: returnPolicies.label,
      rating1: productRatingStats.rating1,
      rating2: productRatingStats.rating2,
      rating3: productRatingStats.rating3,
      rating4: productRatingStats.rating4,
      rating5: productRatingStats.rating5,
    })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .leftJoin(brands, eq(brands.id, products.brandId))
    .leftJoin(warrantyPolicies, eq(warrantyPolicies.id, products.warrantyPolicyId))
    .leftJoin(shippingPolicies, eq(shippingPolicies.id, products.shippingPolicyId))
    .leftJoin(returnPolicies, eq(returnPolicies.id, products.returnPolicyId))
    .leftJoin(productRatingStats, eq(productRatingStats.productId, products.id))
    .leftJoin(
      productImages,
      and(eq(productImages.productId, products.id), eq(productImages.isPrimary, true)),
    )
    .where(and(includeDeleted ? undefined : notDeleted, eq(products.id, id)))
  return row
}

export function findTags(db: Database, productIds?: number[]) {
  const query = db
    .select({ productId: productTags.productId, slug: tags.slug, name: tags.name })
    .from(productTags)
    .innerJoin(tags, eq(tags.id, productTags.tagId))
  return (productIds ? query.where(inArray(productTags.productId, productIds)) : query).orderBy(
    asc(tags.name),
  )
}

export function findImages(db: Database, productId: number) {
  return db
    .select({
      url: productImages.url,
      position: productImages.position,
      isPrimary: productImages.isPrimary,
    })
    .from(productImages)
    .where(eq(productImages.productId, productId))
    .orderBy(asc(productImages.position))
}

export function findReviews(db: Database, productId: number) {
  return db
    .select(reviewColumns)
    .from(reviews)
    .innerJoin(user, eq(user.id, reviews.userId))
    .where(eq(reviews.productId, productId))
    .orderBy(desc(reviews.createdAt), desc(reviews.id))
}

export function findCategories(db: Database) {
  return db
    .select({ id: categories.id, slug: categories.slug, name: categories.name })
    .from(categories)
    .orderBy(asc(categories.sortOrder), asc(categories.name))
}
