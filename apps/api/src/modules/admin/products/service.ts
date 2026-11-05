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
import { dbError, duplicateField, toConflict } from '../../../utils/db-errors'
import { AppError, appError, type ErrorMeta } from '../../../utils/errors'
import { getProduct } from '../../catalog/service'

type Tx = Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0]

const missing = (op: string, id: number) =>
  appError('not_found', 'Product not found', op, 'service', { id })

/** A constraint failure of an admin write as the error the client should get; the rest via `dbError`. */
function writeError(error: unknown, op: string, meta: ErrorMeta) {
  if (error instanceof AppError) return error
  const conflict = toConflict(error)
  if (conflict?.kind === 'duplicate') {
    const field = duplicateField(conflict.constraint)
    const message = `A product with this ${field} already exists`
    return appError('duplicate', message, op, 'service', { ...meta, field })
  }
  if (conflict?.kind === 'missing_reference') {
    const message = 'A category, brand, policy or tag you chose does not exist'
    return appError('unknown_reference', message, op, 'service', meta)
  }
  return dbError(error, op, 'service', meta)
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

export async function createProduct(body: ProductBody): Promise<ProductDetail> {
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
    return await getProduct(id, true)
  } catch (error) {
    throw writeError(error, 'admin.products.create', { sku: body.sku })
  }
}

export async function updateProduct(id: number, body: ProductPatchBody): Promise<ProductDetail> {
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
    if (!found) throw missing('admin.products.update', id)
    return await getProduct(id, true)
  } catch (error) {
    throw writeError(error, 'admin.products.update', { id })
  }
}

/** Soft delete; the product also leaves every cart, favorites and recently viewed list. Past orders keep their snapshot. */
export async function softDeleteProduct(id: number): Promise<void> {
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
  if (!found) throw missing('admin.products.softDelete', id)
}

export async function restoreProduct(id: number): Promise<ProductDetail> {
  const [row] = await getDb()
    .update(products)
    .set({ deletedAt: null, updatedAt: sql`now()` })
    .where(eq(products.id, id))
    .returning({ id: products.id })
  if (!row) throw missing('admin.products.restore', id)
  return await getProduct(id, true)
}
