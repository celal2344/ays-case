import { roleSchema, toCents } from '@ays/validators'
import { hashPassword } from 'better-auth/crypto'
import { sql } from 'drizzle-orm'
import type { AnyPgColumn } from 'drizzle-orm/pg-core'
import { z } from 'zod'

import type { Database } from '../../src/db/client'
import {
  account,
  brands,
  categories,
  productImages,
  products,
  productTags,
  returnPolicies,
  reviews,
  shippingPolicies,
  tags,
  user,
  warrantyPolicies,
} from '../../src/db/schema'
import categoriesData from '../fixtures/categories.json'
import productsData from '../fixtures/products.json'
import usersData from '../fixtures/users.json'

const seedCategorySchema = z.array(z.object({ slug: z.string(), name: z.string() }))

const seedUserSchema = z.object({
  users: z.array(
    z.object({
      id: z.number().int(),
      username: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      email: z.string(),
      role: roleSchema,
      image: z.string(),
    }),
  ),
})

/** The only accounts that can sign in: the documented demo accounts. */
const DEMO_PASSWORDS: Record<string, string> = { emilys: 'emilyspass', averyp: 'averyppass' }

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
      reviews: z.array(
        z.object({ rating: z.number().int(), comment: z.string(), date: z.string() }),
      ),
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

/** The minimum order quantity can never exceed stock (some fixture products break this). */
export const clampMinimumOrder = (moq: number, stock: number) => Math.max(1, Math.min(moq, stock))

const userId = (id: number) => `user-${id}`

/** Review ids are derived from the product id so a re-run updates rows instead of duplicating them. */
const reviewId = (productId: number, index: number) => productId * 1000 + index + 1

const distinct = (values: Array<string | undefined>) => [
  ...new Set(values.filter((value): value is string => Boolean(value))),
]

export function loadFixture() {
  const seedCategories = seedCategorySchema.parse(categoriesData)
  const seedProducts = seedProductSchema.parse(productsData).products
  const seedUsers = seedUserSchema.parse(usersData).users
  // Round robin over the users, so the (product, user) rule holds: a product has at most 3 reviews.
  const seedReviews = seedProducts
    .flatMap((p) => p.reviews.map((review, index) => ({ productId: p.id, index, review })))
    .map(({ productId, index, review }, position) => ({
      id: reviewId(productId, index),
      productId,
      userId: userId(seedUsers[position % seedUsers.length]!.id),
      rating: review.rating,
      comment: review.comment,
      createdAt: new Date(review.date),
      updatedAt: new Date(review.date),
    }))
  return {
    users: seedUsers.map((u) => ({
      id: userId(u.id),
      name: `${u.firstName} ${u.lastName}`,
      email: u.email.toLowerCase(),
      username: u.username.toLowerCase(),
      displayUsername: u.username,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      image: u.image,
      emailVerified: true,
    })),
    reviews: seedReviews,
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
      // fixture weights are read as kilograms and dimensions as centimetres.
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
export async function runFixture(db: Database) {
  const data = loadFixture()
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

    await tx
      .insert(user)
      .values(data.users)
      .onConflictDoUpdate({
        target: user.id,
        set: {
          name: excluded(user.name),
          email: excluded(user.email),
          username: excluded(user.username),
          displayUsername: excluded(user.displayUsername),
          firstName: excluded(user.firstName),
          lastName: excluded(user.lastName),
          role: excluded(user.role),
          image: excluded(user.image),
        },
      })

    // Everyone else has no credential account, so they cannot sign in.
    const demoAccounts = await Promise.all(
      data.users
        .filter((u) => u.username in DEMO_PASSWORDS)
        .map(async (u) => ({
          id: `credential-${u.id}`,
          accountId: u.id,
          providerId: 'credential',
          userId: u.id,
          password: await hashPassword(DEMO_PASSWORDS[u.username] ?? ''),
        })),
    )
    await tx.insert(account).values(demoAccounts).onConflictDoNothing()

    await tx
      .insert(reviews)
      .values(data.reviews)
      .onConflictDoUpdate({
        target: reviews.id,
        set: {
          productId: excluded(reviews.productId),
          userId: excluded(reviews.userId),
          rating: excluded(reviews.rating),
          comment: excluded(reviews.comment),
          createdAt: excluded(reviews.createdAt),
          updatedAt: excluded(reviews.updatedAt),
        },
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
      'reviews',
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
      users: data.users.length,
      reviews: data.reviews.length,
    }
  })
}
