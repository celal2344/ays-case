import { beforeEach, describe, expect, it } from 'vitest'

import { buildCartItems, cartTotals } from '@/features/cart/selectors'
import { fixtureProducts } from '@/test/fixtures/products'

import { buildOrder, hasBought } from '../build-order'
import { shippingSchema } from '../schemas'
import { useOrdersStore } from '../store'

const shipping = {
  fullName: ' Avery Perez ',
  address: '1 Main St ',
  city: 'Izmir',
  phone: '+90 555 111 22 33',
}

function makeOrder(userId = 'user-16', productId = 2) {
  const lines = [{ productId, quantity: 2, addedAt: '2025-01-01' }]
  const { items } = buildCartItems(lines, fixtureProducts)
  return buildOrder({
    id: `order-${userId}-${productId}`,
    userId,
    createdAt: '2025-06-01T10:00:00.000Z',
    items,
    totals: cartTotals(items),
    shipping,
  })
}

describe('buildOrder (CART-5)', () => {
  it('snapshots titles and prices in cents and trims the shipping details', () => {
    const order = makeOrder()
    expect(order.lines).toEqual([
      {
        productId: 2,
        title: 'groceries item 02',
        thumbnail: fixtureProducts[1]!.thumbnail,
        listCents: 2000,
        unitCents: 1800, // 10% off
        discountPercentage: 10,
        quantity: 2,
      },
    ])
    expect(order.totals).toEqual({ subtotalCents: 4000, discountCents: 400, totalCents: 3600 })
    expect(order.shipping).toEqual({
      fullName: 'Avery Perez',
      address: '1 Main St',
      city: 'Izmir',
      phone: '+90 555 111 22 33',
    })
  })

  it('does not change when the product is edited afterwards', () => {
    const order = makeOrder()
    const edited = { ...fixtureProducts[1]!, title: 'Renamed', priceCents: 99900 }
    expect(edited.priceCents).not.toBe(order.lines[0]?.listCents)
    expect(order.lines[0]?.title).toBe('groceries item 02')
    expect(order.lines[0]?.listCents).toBe(2000)
  })
})

describe('hasBought (REV-5)', () => {
  it('is true only for the buyer and a product in one of their orders', () => {
    const orders = [makeOrder('user-16', 2)]
    expect(hasBought(orders, 'user-16', 2)).toBe(true)
    expect(hasBought(orders, 'user-16', 5)).toBe(false)
    expect(hasBought(orders, 'user-1', 2)).toBe(false)
  })
})

describe('shipping schema', () => {
  const valid = {
    fullName: 'Avery Perez',
    address: '1 Main Street',
    city: 'Izmir',
    phone: '5551112233',
  }
  const issues = (values: object) => {
    const result = shippingSchema.safeParse({ ...valid, ...values })
    return result.success ? [] : result.error.issues.map((i) => i.path.join('.'))
  }

  it('accepts valid details and rejects the empty form', () => {
    expect(shippingSchema.safeParse(valid).success).toBe(true)
    expect(issues({ fullName: '', address: '', city: '', phone: '' }).sort()).toEqual([
      'address',
      'city',
      'fullName',
      'phone',
    ])
  })

  it('checks lengths and the phone format', () => {
    expect(issues({ fullName: 'A' })).toEqual(['fullName'])
    expect(issues({ address: 'x'.repeat(201) })).toEqual(['address'])
    expect(issues({ phone: 'call me' })).toEqual(['phone'])
    expect(issues({ phone: '+90 (555) 111-22-33' })).toEqual([])
  })
})

describe('orders store', () => {
  beforeEach(() => useOrdersStore.getState().reset())

  it('keeps the newest order first, persists under the versioned key and resets', () => {
    useOrdersStore.getState().add(makeOrder('user-16', 2))
    useOrdersStore.getState().add(makeOrder('user-16', 5))
    expect(useOrdersStore.getState().orders.map((o) => o.id)).toEqual([
      'order-user-16-5',
      'order-user-16-2',
    ])
    const saved = JSON.parse(localStorage.getItem('ays-case:v1:orders') ?? '{}')
    expect(saved.version).toBe(1)
    expect(saved.state.orders).toHaveLength(2)
    useOrdersStore.getState().reset()
    expect(useOrdersStore.getState().orders).toEqual([])
  })
})
