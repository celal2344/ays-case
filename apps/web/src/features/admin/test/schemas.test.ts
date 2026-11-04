import { describe, expect, it } from 'vitest'

import { fixtureDetail } from '@/test/fixtures/products'

import {
  adminProductSearchSchema,
  emptyProductForm,
  productFormSchema,
  toFormValues,
  toProductBody,
  type ProductFormValues,
} from '../schemas'

const valid: ProductFormValues = {
  ...emptyProductForm,
  title: 'Desk lamp',
  description: 'A warm desk lamp for late nights.',
  sku: 'LAMP-1',
  categoryId: '2',
  brandId: '3',
  price: '24.99',
  discountPercentage: '10',
  stock: '7',
  tagIds: ['1', '2'],
  images: [{ url: 'https://img.test/a.webp' }, { url: 'https://img.test/b.webp' }],
  primaryImage: 1,
}

const issues = (values: Partial<ProductFormValues>) => {
  const result = productFormSchema.safeParse({ ...valid, ...values })
  return result.success ? [] : result.error.issues.map((i) => i.path[0])
}

describe('productFormSchema', () => {
  it('accepts a valid product', () => {
    expect(productFormSchema.safeParse(valid).success).toBe(true)
  })

  it('requires the empty form to be filled in', () => {
    const result = productFormSchema.safeParse(emptyProductForm)
    const paths = result.success ? [] : result.error.issues.map((i) => i.path[0])
    expect([...new Set(paths)].sort()).toEqual([
      'categoryId',
      'description',
      'price',
      'sku',
      'title',
    ])
  })

  it('title: 2–100 characters', () => {
    expect(issues({ title: 'a' })).toEqual(['title'])
    expect(issues({ title: 'x'.repeat(101) })).toEqual(['title'])
  })

  it('description: 10–1000 characters', () => {
    expect(issues({ description: 'too short' })).toEqual(['description'])
    expect(issues({ description: 'x'.repeat(1001) })).toEqual(['description'])
  })

  it('price: above 0 with at most 2 decimals', () => {
    for (const price of ['0', '-1', 'abc', '1.234', '', '1,5'])
      expect(issues({ price })).toEqual(['price'])
    for (const price of ['0.01', '10', '10.5', '1999.99']) expect(issues({ price })).toEqual([])
  })

  it('discount: 0–100', () => {
    expect(issues({ discountPercentage: '101' })).toEqual(['discountPercentage'])
    expect(issues({ discountPercentage: '-1' })).toEqual(['discountPercentage'])
    expect(issues({ discountPercentage: '100' })).toEqual([])
    expect(issues({ discountPercentage: '0' })).toEqual([])
  })

  it('stock: a whole number, 0 or more', () => {
    for (const stock of ['-1', '1.5', 'x', '']) expect(issues({ stock })).toEqual(['stock'])
    expect(issues({ stock: '0' })).toEqual([])
  })

  it('minimum order quantity: a whole number, 1 or more', () => {
    for (const minimumOrderQuantity of ['0', '1.5', ''])
      expect(issues({ minimumOrderQuantity })).toEqual(['minimumOrderQuantity'])
  })

  it('measures: empty or a positive number with limited decimals', () => {
    expect(issues({ weightKg: '', widthCm: '' })).toEqual([])
    expect(issues({ weightKg: '1.25' })).toEqual([])
    expect(issues({ weightKg: '0' })).toEqual(['weightKg'])
    expect(issues({ widthCm: '1.25' })).toEqual(['widthCm'])
  })

  it('image URLs must be http(s)', () => {
    expect(issues({ images: [{ url: 'not a url' }] })).toEqual(['images'])
    expect(issues({ images: [{ url: 'javascript:alert(1)' }] })).toEqual(['images'])
  })
})

describe('form ↔ request body mapping', () => {
  it('toProductBody turns strings into numbers, cents, grams and millimetres', () => {
    expect(
      toProductBody({ ...valid, weightKg: '1.5', widthCm: '12.5', barcode: '  ' }),
    ).toMatchObject({
      title: 'Desk lamp',
      sku: 'LAMP-1',
      barcode: null,
      categoryId: 2,
      brandId: 3,
      priceCents: 2499,
      discountPercentage: 10,
      stock: 7,
      weightG: 1500,
      widthMm: 125,
      heightMm: null,
      tagIds: [1, 2],
      images: [
        { url: 'https://img.test/a.webp', isPrimary: false },
        { url: 'https://img.test/b.webp', isPrimary: true },
      ],
    })
  })

  it('toProductBody sends null for an empty brand and policies', () => {
    const body = toProductBody({ ...valid, brandId: '' })
    expect(body.brandId).toBeNull()
    expect(body.warrantyPolicyId).toBeNull()
  })

  it('toFormValues round-trips a product detail', () => {
    const detail = fixtureDetail(2)!
    const tagIdBySlug = new Map(detail.tags.map((tag, index) => [tag.slug, index + 1]))
    const values = toFormValues(detail, tagIdBySlug)
    expect(productFormSchema.safeParse(values).success).toBe(true)
    expect(toProductBody(values)).toMatchObject({
      title: detail.title,
      sku: detail.sku,
      priceCents: detail.priceCents,
      stock: detail.stock,
      weightG: 4000,
      widthMm: 150,
      tagIds: [1, 2],
    })
  })
})

describe('adminProductSearchSchema', () => {
  it('parses a full URL and ignores junk', () => {
    expect(
      adminProductSearchSchema.parse({
        q: 'a',
        category: 'beauty',
        sort: 'price',
        order: 'desc',
        page: '3',
      }),
    ).toEqual({ q: 'a', category: 'beauty', sort: 'price', order: 'desc', page: 3 })
    expect(adminProductSearchSchema.parse({ sort: 'color', page: '0', order: 'up' })).toEqual({})
  })
})
