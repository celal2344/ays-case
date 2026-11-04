import { toCents } from '@ays/validators'
import { sql } from 'drizzle-orm'
import type { AnyPgColumn } from 'drizzle-orm/pg-core'
import { z } from 'zod'

import type { Database } from './client'
import {
  brands,
  categories,
  productImages,
  products,
  productTags,
  returnPolicies,
  shippingPolicies,
  tags,
  warrantyPolicies,
} from './schema'
import categoriesData from './seed-data/categories.json'
import productsData from './seed-data/products.json'

const seedCategorySchema = z.array(z.object({ slug: z.string(), name: z.string() }))

const seedProductSchema = z.object({
  products: z.array(
    z.object({
      id: z.number().int(),
      title: z.string(),
      description: z.string(),
      category: z.string(),
      price: z.number(),
      discountPercentage: z.number(),
      stock: z.number().int(),
      tags: z.array(z.string()),
      brand: z.string().optional(),
      sku: z.string(),
      weight: z.number(),
      dimensions: z.object({ width: z.number(), height: z.number(), depth: z.number() }),
      warrantyInformation: z.string(),
      shippingInformation: z.string(),
      returnPolicy: z.string(),
      minimumOrderQuantity: z.number().int(),
      images: z.array(z.string()),
      thumbnail: z.string(),
      meta: z.object({ createdAt: z.string(), updatedAt: z.string(), barcode: z.string() }),
    }),
  ),
})

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** The minimum order quantity can never exceed stock (21 DummyJSON products break this). */
export const clampMinimumOrder = (moq: number, stock: number) => Math.max(1, Math.min(moq, stock))

const distinct = (values: Array<string | undefined>) => [
  ...new Set(values.filter((value): value is string => Boolean(value))),
]

export function loadSeedData() {
  const seedCategories = seedCategorySchema.parse(categoriesData)
  const seedProducts = seedProductSchema.parse(productsData).products
  return {
    categories: seedCategories.map(({ slug, name }, index) => ({
      slug,
      name,
      sortOrder: index,
    })),
    brands: distinct(seedProducts.map((p) => p.brand)).map((name) => ({
      slug: slugify(name),
      name,
    })),
    warranty: distinct(seedProducts.map((p) => p.warrantyInformation)).map((label) => ({ label })),
    shipping: distinct(seedProducts.map((p) => p.shippingInformation)).map((label) => ({ label })),
    returns: distinct(seedProducts.map((p) => p.returnPolicy)).map((label) => ({ label })),
    tags: distinct(seedProducts.flatMap((p) => p.tags)).map((name) => ({
      slug: slugify(name),
      name,
    })),
    products: seedProducts.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      sku: p.sku,
      barcode: p.meta.barcode,
      categorySlug: p.category,
      brandName: p.brand ?? null,
      warranty: p.warrantyInformation,
      shipping: p.shippingInformation,
      returns: p.returnPolicy,
      priceCents: toCents(p.price),
      discountPercentage: p.discountPercentage.toFixed(2),
      stock: p.stock,
      minimumOrderQuantity: clampMinimumOrder(p.minimumOrderQuantity, p.stock),
      // DummyJSON weights are read as kilograms and dimensions as centimetres.
      weightG: Math.round(p.weight * 1000),
      widthMm: Math.round(p.dimensions.width * 10),
      heightMm: Math.round(p.dimensions.height * 10),
      depthMm: Math.round(p.dimensions.depth * 10),
      createdAt: new Date(p.meta.createdAt),
      updatedAt: new Date(p.meta.updatedAt),
      tagSlugs: p.tags.map(slugify),
      // The thumbnail is not part of `images`, so it becomes the primary image at position 0.
      images: [p.thumbnail, ...p.images].map((url, position) => ({
        url,
        position,
        isPrimary: position === 0,
      })),
    })),
  }
}

const excluded = (column: AnyPgColumn) => sql.raw(`excluded."${column.name}"`)

/** Upserts the catalog. Safe to run repeatedly. */
export async function runSeed(db: Database) {
  const data = loadSeedData()
  return db.transaction(async (tx) => {
    const categoryRows = await tx
      .insert(categories)
      .values(data.categories)
      .onConflictDoUpdate({
        target: categories.slug,
        set: { name: excluded(categories.name), sortOrder: excluded(categories.sortOrder) },
      })
      .returning({ id: categories.id, slug: categories.slug })

    const brandRows = await tx
      .insert(brands)
      .values(data.brands)
      .onConflictDoUpdate({ target: brands.name, set: { slug: excluded(brands.slug) } })
      .returning({ id: brands.id, name: brands.name })

    const tagRows = await tx
      .insert(tags)
      .values(data.tags)
      .onConflictDoUpdate({
        target: tags.slug,
        set: { name: excluded(tags.name) },
      })
      .returning({ id: tags.id, slug: tags.slug })

    const policyIds = async (
      table: typeof warrantyPolicies | typeof shippingPolicies | typeof returnPolicies,
      values: Array<{ label: string }>,
    ) => {
      const rows = await tx
        .insert(table)
        .values(values)
        .onConflictDoUpdate({ target: table.label, set: { label: excluded(table.label) } })
        .returning({ id: table.id, label: table.label })
      return new Map(rows.map((row) => [row.label, row.id]))
    }
    const warranty = await policyIds(warrantyPolicies, data.warranty)
    const shipping = await policyIds(shippingPolicies, data.shipping)
    const returns = await policyIds(returnPolicies, data.returns)

    const categoryId = new Map(categoryRows.map((row) => [row.slug, row.id]))
    const brandId = new Map(brandRows.map((row) => [row.name, row.id]))
    const tagId = new Map(tagRows.map((row) => [row.slug, row.id]))

    const need = (map: Map<string, number>, key: string) => {
      const value = map.get(key)
      if (value === undefined) throw new Error(`Seed lookup missing: ${key}`)
      return value
    }

    await tx
      .insert(products)
      .values(
        data.products.map((p) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          sku: p.sku,
          barcode: p.barcode,
          categoryId: need(categoryId, p.categorySlug),
          brandId: p.brandName ? need(brandId, p.brandName) : null,
          priceCents: p.priceCents,
          discountPercentage: p.discountPercentage,
          stock: p.stock,
          minimumOrderQuantity: p.minimumOrderQuantity,
          weightG: p.weightG,
          widthMm: p.widthMm,
          heightMm: p.heightMm,
          depthMm: p.depthMm,
          warrantyPolicyId: need(warranty, p.warranty),
          shippingPolicyId: need(shipping, p.shipping),
          returnPolicyId: need(returns, p.returns),
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        })),
      )
      .onConflictDoUpdate({
        target: products.id,
        set: {
          title: excluded(products.title),
          description: excluded(products.description),
          sku: excluded(products.sku),
          barcode: excluded(products.barcode),
          categoryId: excluded(products.categoryId),
          brandId: excluded(products.brandId),
          priceCents: excluded(products.priceCents),
          discountPercentage: excluded(products.discountPercentage),
          stock: excluded(products.stock),
          minimumOrderQuantity: excluded(products.minimumOrderQuantity),
          weightG: excluded(products.weightG),
          widthMm: excluded(products.widthMm),
          heightMm: excluded(products.heightMm),
          depthMm: excluded(products.depthMm),
          warrantyPolicyId: excluded(products.warrantyPolicyId),
          shippingPolicyId: excluded(products.shippingPolicyId),
          returnPolicyId: excluded(products.returnPolicyId),
        },
      })

    await tx
      .insert(productTags)
      .values(
        data.products.flatMap((p) =>
          p.tagSlugs.map((slug) => ({ productId: p.id, tagId: need(tagId, slug) })),
        ),
      )
      .onConflictDoNothing()

    await tx
      .insert(productImages)
      .values(
        data.products.flatMap((p) => p.images.map((image) => ({ productId: p.id, ...image }))),
      )
      .onConflictDoUpdate({
        target: [productImages.productId, productImages.position],
        set: { url: excluded(productImages.url), isPrimary: excluded(productImages.isPrimary) },
      })

    // New rows must get ids above the seeded ones.
    for (const table of [
      'categories',
      'brands',
      'tags',
      'warranty_policies',
      'shipping_policies',
      'return_policies',
      'products',
      'product_images',
    ]) {
      await tx.execute(
        sql.raw(
          `select setval(pg_get_serial_sequence('${table}', 'id'), (select max(id) from ${table}))`,
        ),
      )
    }

    return {
      categories: data.categories.length,
      brands: data.brands.length,
      warrantyPolicies: data.warranty.length,
      shippingPolicies: data.shipping.length,
      returnPolicies: data.returns.length,
      tags: data.tags.length,
      products: data.products.length,
      productTags: data.products.reduce((n, p) => n + p.tagSlugs.length, 0),
      productImages: data.products.reduce((n, p) => n + p.images.length, 0),
    }
  })
}
