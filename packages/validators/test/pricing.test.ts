import { describe, expect, it } from 'vitest'

import { salePriceCents, toCents } from '../src/index.js'

describe('pricing (integer cents)', () => {
  it('avoids float drift', () => {
    expect(toCents(0.1 + 0.2)).toBe(30)
    expect(toCents(19.99)).toBe(1999)
  })

  it('applies the discount percentage to the price', () => {
    expect(salePriceCents({ price: 100, discountPercentage: 10 })).toBe(9000)
    expect(salePriceCents({ price: 9.99, discountPercentage: 10.48 })).toBe(894)
  })
})
