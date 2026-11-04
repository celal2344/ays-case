import { describe, expect, it } from 'vitest'

import { fixtureProducts } from '@/test/fixtures/products'

import { buildCartItems, cartTotals, selectCount } from '../selectors'

const line = (productId: number, quantity: number) => ({
  productId,
  quantity,
  addedAt: '2025-01-01T00:00:00Z',
})

// fixtures: id n costs n*10; even ids have 10% off; id 3 has no stock, id 6 has 4
describe('cart selectors', () => {
  it('counts units, not lines', () => {
    expect(selectCount([line(1, 2), line(2, 3)])).toBe(5)
    expect(selectCount([])).toBe(0)
  })

  it('joins lines with the catalog and reports products that no longer exist', () => {
    const { items, missing } = buildCartItems([line(1, 2), line(999, 1)], fixtureProducts)
    expect(items.map((i) => i.product.id)).toEqual([1])
    expect(missing).toEqual([999])
  })

  it('computes totals in integer cents', () => {
    const { items } = buildCartItems([line(1, 2), line(2, 1)], fixtureProducts)
    // 2 × $10.00 + 1 × $20.00 at 10% off = $18.00
    expect(cartTotals(items)).toEqual({ subtotalCents: 4000, discountCents: 200, totalCents: 3800 })
  })

  it('clamps the quantity to current stock when stock dropped below it', () => {
    const { items } = buildCartItems([line(6, 9)], fixtureProducts) // stock 4
    expect(items[0]).toMatchObject({ quantity: 4, available: true })
  })

  it('excludes out-of-stock lines from the totals', () => {
    const { items } = buildCartItems([line(1, 1), line(3, 2)], fixtureProducts)
    expect(items.find((i) => i.product.id === 3)).toMatchObject({ available: false, lineCents: 0 })
    expect(cartTotals(items)).toEqual({ subtotalCents: 1000, discountCents: 0, totalCents: 1000 })
  })

  it('does not drift on float-unfriendly prices', () => {
    const product = { ...fixtureProducts[0]!, id: 500, price: 0.1, discountPercentage: 0 }
    const { items } = buildCartItems([line(500, 3)], [product])
    expect(cartTotals(items).totalCents).toBe(30)
  })
})
