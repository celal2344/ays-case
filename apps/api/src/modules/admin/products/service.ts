import type { ProductBody, ProductDetail, ProductPatchBody } from '@ays/validators'

import { getDb, type Database } from '../../../db/client'
import { dbError, duplicateField, toConflict } from '../../../utils/db-errors'
import { AppError, appError, type ErrorMeta } from '../../../utils/errors'
import { getProduct } from '../../catalog/service'
import * as repository from './repository'

const missing = (op: string, id: number) => appError('not_found', 'Product not found', op, { id })

/** A constraint failure of an admin write as the error the client should get; the rest via `dbError`. */
function writeError(error: unknown, op: string, meta: ErrorMeta) {
  if (error instanceof AppError) return error
  const conflict = toConflict(error)
  if (conflict?.kind === 'duplicate') {
    const field = duplicateField(conflict.constraint)
    const message = `A product with this ${field} already exists`
    return appError('duplicate', message, op, { ...meta, field })
  }
  if (conflict?.kind === 'missing_reference') {
    const message = 'A category, brand, policy or tag you chose does not exist'
    return appError('unknown_reference', message, op, meta)
  }
  return dbError(error, op, meta)
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

const replaceTags = (db: Database, productId: number, tagIds: number[]) =>
  repository.replaceTags(db, productId, [...new Set(tagIds)])

/** The array order is the position; exactly one image is primary (the flagged one, else the first). */
function replaceImages(db: Database, productId: number, images: ProductBody['images']) {
  const flagged = images.findIndex((image) => image.isPrimary)
  return repository.replaceImages(db, productId, images, flagged === -1 ? 0 : flagged)
}

export async function createProduct(body: ProductBody): Promise<ProductDetail> {
  const db = getDb()
  try {
    const id = await db.transaction(async (tx) => {
      const created = await repository.insertProduct(tx, { ...columns(body), title: body.title })
      await replaceTags(tx, created, body.tagIds)
      await replaceImages(tx, created, body.images)
      return created
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
      if (!(await repository.updateProduct(tx, id, columns(body)))) return false
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
    if (!(await repository.markDeleted(tx, id))) return false
    await repository.removeFromLists(tx, id)
    return true
  })
  if (!found) throw missing('admin.products.softDelete', id)
}

export async function restoreProduct(id: number): Promise<ProductDetail> {
  if (!(await repository.clearDeleted(getDb(), id))) throw missing('admin.products.restore', id)
  return await getProduct(id, true)
}
