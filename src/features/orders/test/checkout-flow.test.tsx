import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { buildCartItems, cartTotals } from '@/features/cart/selectors'
import { useCartStore } from '@/features/cart/store'
import { useProductOverlayStore } from '@/features/products/overlay-store'
import { useReviewsStore } from '@/features/reviews/store'
import { signInAs } from '@/test/auth'
import { fixtureProducts, productInput } from '@/test/fixtures/products'
import { server } from '@/test/msw/server'
import { renderApp } from '@/test/render'

import { buildOrder } from '../build-order'
import { useOrdersStore } from '../store'

const orders = () => useOrdersStore.getState().orders

async function fillShipping() {
  await userEvent.type(screen.getByLabelText('Full name'), 'Avery Perez')
  await userEvent.type(screen.getByLabelText('Address'), '1 Main Street')
  await userEvent.type(screen.getByLabelText('City'), 'Izmir')
  await userEvent.type(screen.getByLabelText('Phone'), '5551112233')
}

function captureCartRequests() {
  const bodies: unknown[] = []
  server.use(
    http.post('https://dummyjson.com/carts/add', async ({ request }) => {
      const body = (await request.json()) as { products: { id: number }[] }
      bodies.push(body)
      return HttpResponse.json({ id: 209, products: body.products })
    }),
  )
  return bodies
}

describe('checkout (CART-5)', () => {
  it('buys the cart: DummyJSON receipt, order with snapshot prices, stock down, cart empty', async () => {
    const bodies = captureCartRequests()
    signInAs('averyp')
    useCartStore.getState().add(16, 2, 2, 50) // 20 − 10% = 18.00 each
    useCartStore.getState().add(16, 5, 1, 50) // 50.00
    const { router } = await renderApp('/checkout')

    expect(await screen.findByTestId('checkout-total')).toHaveTextContent('$86.00')
    await fillShipping()
    await userEvent.click(screen.getByRole('button', { name: 'Place order' }))

    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/orders\/.+/))
    expect(router.state.location.search).toEqual({ placed: 1 })
    expect(bodies).toEqual([
      {
        userId: 16,
        products: [
          { id: 2, quantity: 2 },
          { id: 5, quantity: 1 },
        ],
      },
    ])
    expect(await screen.findByText('Thank you, your order is placed!')).toBeInTheDocument()
    expect(screen.getByTestId('order-total')).toHaveTextContent('$86.00')
    expect(screen.getByText('Izmir')).toBeInTheDocument()

    expect(orders()).toHaveLength(1)
    expect(orders()[0]).toMatchObject({ userId: 16, remoteCartId: 209 })
    expect(orders()[0]?.lines.map((l) => [l.productId, l.quantity, l.unitCents])).toEqual([
      [2, 2, 1800],
      [5, 1, 5000],
    ])
    expect(useProductOverlayStore.getState().patched[2]?.stock).toBe(48)
    expect(useProductOverlayStore.getState().patched[5]?.stock).toBe(49)
    expect(useCartStore.getState().byUser[16]).toEqual([])
  })

  it('past orders keep their prices after an admin edit', async () => {
    signInAs('averyp')
    useCartStore.getState().add(16, 2, 1, 50)
    const { router } = await renderApp('/checkout')
    await screen.findByTestId('checkout-total')
    await fillShipping()
    await userEvent.click(screen.getByRole('button', { name: 'Place order' }))
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/orders\/.+/))

    useProductOverlayStore.getState().update(2, { price: 999, title: 'Renamed' })
    await router.navigate({ to: '/orders' })
    await userEvent.click(await screen.findByRole('link', { name: /Order #/ }))
    expect(await screen.findByText('groceries item 02')).toBeInTheDocument()
    expect(screen.getByTestId('order-total')).toHaveTextContent('$18.00')
  })

  it('shows what to fix and creates nothing when the shipping details are invalid', async () => {
    const bodies = captureCartRequests()
    signInAs('averyp')
    useCartStore.getState().add(16, 2, 1, 50)
    await renderApp('/checkout')
    await screen.findByTestId('checkout-total')
    await userEvent.click(screen.getByRole('button', { name: 'Place order' }))
    expect(await screen.findByText('Enter your full name (2–80 characters).')).toBeInTheDocument()
    expect(screen.getByText('Enter a valid phone number.')).toBeInTheDocument()
    expect(bodies).toEqual([])
    expect(orders()).toEqual([])
    expect(useCartStore.getState().byUser[16]).toHaveLength(1)
  })

  it('an empty cart goes back to the cart page', async () => {
    signInAs('averyp')
    const { router } = await renderApp('/checkout')
    await waitFor(() => expect(router.state.location.pathname).toBe('/cart'))
  })

  it('refuses when stock dropped below the cart quantity, touching nothing', async () => {
    const bodies = captureCartRequests()
    signInAs('averyp')
    useCartStore.getState().add(16, 2, 5, 50)
    await renderApp('/checkout')
    await screen.findByTestId('checkout-total')
    useProductOverlayStore.getState().update(2, { stock: 2 }) // an admin lowered it meanwhile
    await fillShipping()
    await userEvent.click(screen.getByRole('button', { name: 'Place order' }))
    expect(
      await screen.findByText('Not enough stock for groceries item 02. Review your cart.'),
    ).toBeInTheDocument()
    expect(bodies).toEqual([])
    expect(orders()).toEqual([])
    expect(useCartStore.getState().byUser[16]?.[0]?.quantity).toBe(5)
  })

  it('keeps the cart and stock when DummyJSON fails', async () => {
    server.use(
      http.post('https://dummyjson.com/carts/add', () =>
        HttpResponse.json({ message: 'boom' }, { status: 500 }),
      ),
    )
    signInAs('averyp')
    useCartStore.getState().add(16, 2, 1, 50)
    await renderApp('/checkout')
    await screen.findByTestId('checkout-total')
    await fillShipping()
    await userEvent.click(screen.getByRole('button', { name: 'Place order' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(orders()).toEqual([])
    expect(useCartStore.getState().byUser[16]).toHaveLength(1)
    expect(useProductOverlayStore.getState().patched[2]).toBeUndefined()
  })

  it('a cart of only local products makes no DummyJSON call', async () => {
    const bodies = captureCartRequests()
    signInAs('averyp')
    const local = useProductOverlayStore
      .getState()
      .create(productInput({ title: 'Local gadget', price: 10, discountPercentage: 0, stock: 5 }))
    useCartStore.getState().add(16, local.id, 2, 5)
    const { router } = await renderApp('/checkout')
    await screen.findByTestId('checkout-total')
    await fillShipping()
    await userEvent.click(screen.getByRole('button', { name: 'Place order' }))
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/orders\/.+/))
    expect(bodies).toEqual([])
    expect(orders()[0]?.remoteCartId).toBeUndefined()
    expect(useProductOverlayStore.getState().created[local.id]?.stock).toBe(3)
  })

  it('Cart → Checkout and the cart summary lead to the checkout page', async () => {
    signInAs('averyp')
    useCartStore.getState().add(16, 2, 1, 50)
    const { router } = await renderApp('/cart')
    const checkout = (await screen.findAllByRole('button', { name: 'Checkout' }))[0]!
    await userEvent.click(checkout)
    await waitFor(() => expect(router.state.location.pathname).toBe('/checkout'))
  })
})

describe('orders (EX-6)', () => {
  const seedOrder = (userId: number) => {
    const { items } = buildCartItems([{ productId: 2, quantity: 1, addedAt: '' }], fixtureProducts)
    const order = buildOrder({
      id: `abcdef12-${userId}`,
      userId,
      createdAt: '2025-06-01T10:00:00.000Z',
      items,
      totals: cartTotals(items),
      shipping: {
        fullName: 'Someone',
        address: '1 Main Street',
        city: 'Izmir',
        phone: '5551112233',
      },
    })
    useOrdersStore.getState().add(order)
    return order
  }

  it('lists only your own orders, with an empty state otherwise', async () => {
    signInAs('averyp')
    seedOrder(1)
    await renderApp('/orders')
    expect(await screen.findByText('You have not placed any orders yet')).toBeInTheDocument()
  })

  it('opens your order and shows 404 for someone else’s', async () => {
    signInAs('averyp')
    const mine = seedOrder(16)
    const theirs = seedOrder(1)
    const view = await renderApp(`/orders/${mine.id}`)
    expect(await screen.findByText('groceries item 02')).toBeInTheDocument()
    expect(screen.queryByText('Thank you, your order is placed!')).not.toBeInTheDocument()
    view.unmount()

    await renderApp(`/orders/${theirs.id}`)
    expect(await screen.findByText('Page not found')).toBeInTheDocument()
    expect(screen.queryByText('groceries item 02')).not.toBeInTheDocument()
  })

  it('REV-5: a review by someone who bought the product shows the verified-buyer badge', async () => {
    signInAs('averyp')
    seedOrder(16)
    useReviewsStore.getState().add({
      productId: 2,
      userId: 16,
      authorName: 'Avery Perez',
      rating: 5,
      comment: 'Loved it',
    })
    await renderApp('/products/2')
    const tab = await screen.findByRole('tab', { name: /Reviews/ })
    await userEvent.click(tab)
    await screen.findByText('Loved it')
    expect(screen.getByText('Verified buyer')).toBeInTheDocument()
  })
})
