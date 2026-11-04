import type { ProductBody, ProductDetail, ProductPatchBody } from '@ays/validators'
import { eq, sql } from 'drizzle-orm'

import { getDb } from '../../../db/client'
import {
  cartItems,
  favorites,
  productImages,
  productTags,
  products,
  recentlyViewed,
} from '../../../db/schema'
import { duplicateField, toConflict } from '../../../utils/db-errors'
import { getProduct } from '../../catalog/service'

type Tx = Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0]

export type WriteFailure = {
  ok: false
  status: 404 | 409 | 422
  code: 'not_found' | 'duplicate' | 'unknown_reference'
  message: string
  field?: string
}
export type ProductResult = { ok: true; product: ProductDetail } | WriteFailure

const notFound: WriteFailure = {
  ok: false,
  status: 404,
  code: 'not_found',
  message: 'Product not found',
}

/** Maps a constraint failure of an admin write to the answer the route sends. */
export function failureOf(error: unknown): WriteFailure | undefined {
  const conflict = toConflict(error)
  if (conflict?.kind === 'duplicate') {
    const field = duplicateField(conflict.constraint)
    return {
      ok: false,
      status: 409,
      code: 'duplicate',
      message: `A product with this ${field} already exists`,
      field,
    }
  }
  if (conflict?.kind === 'missing_reference') {
    return {
      ok: false,
      status: 422,
      code: 'unknown_reference',
      message: 'A category, brand, policy or tag you chose does not exist',
    }
  }
  return undefined
}

async function replaceTags(tx: Tx, productId: number, tagIds: number[]) {
  await tx.delete(productTags).where(eq(productTags.productId, productId))
  const unique = [...new Set(tagIds)]
  if (unique.length > 0) {
    await tx.insert(productTags).values(unique.map((tagId) => ({ productId, tagId })))
  }
}

/** The array order is the position; exactly one image is primary (the flagged one, else the first). */
async function replaceImages(tx: Tx, productId: number, images: ProductBody['images']) {
  await tx.delete(productImages).where(eq(productImages.productId, productId))
  if (images.length === 0) return
  const flagged = images.findIndex((image) => image.isPrimary)
  const primary = flagged === -1 ? 0 : flagged
  await tx.insert(productImages).values(
    images.map((image, position) => ({
      productId,
      url: image.url,
      position,
      isPrimary: position === primary,
    })),
  )
}

const columns = (body: ProductPatchBody) => ({
  ...(body.title === undefined ? {} : { title: body.title }),
  ...(body.description === undefined ? {} : { description: body.description }),
  ...(body.sku === undefined ? {} : { sku: body.sku }),
  ...(body.barcode === undefined ? {} : { barcode: body.barcode }),
  ...(body.categoryId === undefined ? {} : { categoryId: body.categoryId }),
  ...(body.brandId === undefined ? {} : { brandId: body.brandId }),
  ...(body.priceCents === undefined ? {} : { priceCents: body.priceCents }),
  ...(body.discountPercentage === undefined
    ? {}
    : { discountPercentage: String(body.discountPercentage) }),
  ...(body.stock === undefined ? {} : { stock: body.stock }),
  ...(body.minimumOrderQuantity === undefined
    ? {}
    : { minimumOrderQuantity: body.minimumOrderQuantity }),
  ...(body.lowStockThreshold === undefined ? {} : { lowStockThreshold: body.lowStockThreshold }),
  ...(body.weightG === undefined ? {} : { weightG: body.weightG }),
  ...(body.widthMm === undefined ? {} : { widthMm: body.widthMm }),
  ...(body.heightMm === undefined ? {} : { heightMm: body.heightMm }),
  ...(body.depthMm === undefined ? {} : { depthMm: body.depthMm }),
  ...(body.warrantyPolicyId === undefined ? {} : { warrantyPolicyId: body.warrantyPolicyId }),
  ...(body.shippingPolicyId === undefined ? {} : { shippingPolicyId: body.shippingPolicyId }),
  ...(body.returnPolicyId === undefined ? {} : { returnPolicyId: body.returnPolicyId }),
})

export async function createProduct(body: ProductBody): Promise<ProductResult> {
  const db = getDb()
  try {
    const id = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(products)
        .values({ ...columns(body), title: body.title } as typeof products.$inferInsert)
        .returning({ id: products.id })
      await replaceTags(tx, created!.id, body.tagIds)
      await replaceImages(tx, created!.id, body.images)
      return created!.id
    })
    return { ok: true, product: (await getProduct(id, true))! }
  } catch (error) {
    const failure = failureOf(error)
    if (failure) return failure
    throw error
  }
}

export async function updateProduct(id: number, body: ProductPatchBody): Promise<ProductResult> {
  const db = getDb()
  try {
    const found = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(products)
        .set({ ...columns(body), updatedAt: sql`now()` })
        .where(eq(products.id, id))
        .returning({ id: products.id })
      if (!row) return false
      if (body.tagIds !== undefined) await replaceTags(tx, id, body.tagIds)
      if (body.images !== undefined) await replaceImages(tx, id, body.images)
      return true
    })
    if (!found) return notFound
    return { ok: true, product: (await getProduct(id, true))! }
  } catch (error) {
    const failure = failureOf(error)
    if (failure) return failure
    throw error
  }
}

/** Soft delete; the product also leaves every cart, favorites and recently viewed list. Past orders keep their snapshot. */
export async function softDeleteProduct(id: number): Promise<{ ok: true } | WriteFailure> {
  const db = getDb()
  const found = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(products)
      .set({ deletedAt: sql`now()`, updatedAt: sql`now()` })
      .where(eq(products.id, id))
      .returning({ id: products.id })
    if (!row) return false
    await tx.delete(cartItems).where(eq(cartItems.productId, id))
    await tx.delete(favorites).where(eq(favorites.productId, id))
    await tx.delete(recentlyViewed).where(eq(recentlyViewed.productId, id))
    return true
  })
  return found ? { ok: true } : notFound
}

export async function restoreProduct(id: number): Promise<ProductResult> {
  const [row] = await getDb()
    .update(products)
    .set({ deletedAt: null, updatedAt: sql`now()` })
    .where(eq(products.id, id))
    .returning({ id: products.id })
  if (!row) return notFound
  return { ok: true, product: (await getProduct(id, true))! }
}
