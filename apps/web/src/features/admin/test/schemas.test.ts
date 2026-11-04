import { describe, expect, it } from 'vitest'

import { fixtureProducts } from '@/test/fixtures/products'

import {
  adminProductSearchSchema,
  emptyProductForm,
  productFormSchema,
  toFormValues,
  toNewProduct,
  toProductPatch,
  type ProductFormValues,
} from '../schemas'

const valid: ProductFormValues = {
  title: 'Desk lamp',
  description: 'A warm desk lamp for late nights.',
  category: 'furniture',
  brand: 'Lumen',
  price: '24.99',
  discountPercentage: '10',
  stock: '7',
  thumbnail: 'https://img.test/lamp.webp',
}

const issues = (values: Partial<ProductFormValues>) => {
  const result = productFormSchema.safeParse({ ...valid, ...values })
  return result.success ? [] : result.error.issues.map((i) => i.path.join('.'))
}

describe('productFormSchema', () => {
  it('accepts a valid product', () => {
    expect(productFormSchema.safeParse(valid).success).toBe(true)
  })

  it('requires the empty form to be filled in', () => {
    expect(issues(emptyProductForm).sort()).toEqual(['category', 'description', 'price', 'title'])
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

  it('discount: 0–90', () => {
    expect(issues({ discountPercentage: '91' })).toEqual(['discountPercentage'])
    expect(issues({ discountPercentage: '-1' })).toEqual(['discountPercentage'])
    expect(issues({ discountPercentage: '90' })).toEqual([])
    expect(issues({ discountPercentage: '0' })).toEqual([])
  })

  it('stock: a whole number, 0 or more', () => {
    for (const stock of ['-1', '1.5', 'x', '']) expect(issues({ stock })).toEqual(['stock'])
    expect(issues({ stock: '0' })).toEqual([])
  })

  it('brand: at most 50 characters; thumbnail: empty or an http(s) URL', () => {
    expect(issues({ brand: 'x'.repeat(51) })).toEqual(['brand'])
    expect(issues({ thumbnail: '' })).toEqual([])
    expect(issues({ thumbnail: 'not a url' })).toEqual(['thumbnail'])
    expect(issues({ thumbnail: 'javascript:alert(1)' })).toEqual(['thumbnail'])
  })
})

describe('form ↔ product mapping', () => {
  it('toNewProduct turns strings into numbers and fills neutral defaults', () => {
    expect(toNewProduct(valid)).toMatchObject({
      title: 'Desk lamp',
      brand: 'Lumen',
      price: 24.99,
      discountPercentage: 10,
      stock: 7,
      rating: 0,
      availabilityStatus: 'In Stock',
      tags: ['furniture'],
    })
  })

  it('toNewProduct omits an empty brand and marks zero stock as out of stock', () => {
    const product = toNewProduct({ ...valid, brand: '  ', stock: '0' })
    expect('brand' in product).toBe(false)
    expect(product.availabilityStatus).toBe('Out of Stock')
  })

  it('toProductPatch keeps an emptied brand as "" so the patch survives JSON', () => {
    const patch = toProductPatch({ ...valid, brand: '' })
    expect(patch.brand).toBe('')
    expect(JSON.parse(JSON.stringify(patch))).toHaveProperty('brand', '')
  })

  it('toFormValues round-trips a product', () => {
    const product = fixtureProducts[1]!
    const values = toFormValues(product)
    expect(productFormSchema.safeParse(values).success).toBe(true)
    expect(toProductPatch(values)).toMatchObject({
      title: product.title,
      price: product.price,
      stock: product.stock,
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
