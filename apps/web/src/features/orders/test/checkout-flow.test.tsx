import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'

import { signInAs } from '@/test/auth'
import { shopping } from '@/test/msw/handlers'
import { server } from '@/test/msw/server'
import { renderApp } from '@/test/render'

const mine = () => shopping.ordersOf('user-16')

async function fillShipping() {
  await userEvent.type(screen.getByLabelText('Full name'), 'Avery Perez')
  await userEvent.type(screen.getByLabelText('Address'), '1 Main Street')
  await userEvent.type(screen.getByLabelText('City'), 'Izmir')
  await userEvent.type(screen.getByLabelText('Phone'), '5551112233')
}

describe('checkout (CART-5)', () => {
  it('buys the cart on the server: the order shows the server totals, the cart is empty', async () => {
    signInAs('averyp')
    shopping.seedCart('user-16', [
      { productId: 2, quantity: 2 }, // 20 − 10% = 18.00 each
      { productId: 5, quantity: 1 }, // 50.00
    ])
    const { router } = await renderApp('/checkout')

    expect(await screen.findByTestId('checkout-total')).toHaveTextContent('$86.00')
    await fillShipping()
    await userEvent.click(screen.getByRole('button', { name: 'Place order' }))

    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/orders\/.+/))
    expect(router.state.location.search).toEqual({ placed: 1 })
    expect(await screen.findByText('Thank you, your order is placed!')).toBeInTheDocument()
    expect(screen.getByTestId('order-total')).toHaveTextContent('$86.00')
    expect(screen.getByText('Izmir')).toBeInTheDocument()

    expect(mine()).toHaveLength(1)
    expect(mine()[0]?.lines.map((l) => [l.productId, l.quantity, l.unitCents])).toEqual([
      [2, 2, 1800],
      [5, 1, 5000],
    ])
    expect(shopping.cartOf('user-16')).toEqual([])
  })

  it('sends only the shipping details: no totals, no items, no user id', async () => {
    signInAs('averyp')
    shopping.seedCart('user-16', [{ productId: 2, quantity: 1 }])
    let sent: unknown
    server.use(
      http.post('http://localhost/api/orders', async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json(
          { code: 'cart_empty', message: 'Your cart is empty' },
          { status: 422 },
        )
      }),
    )
    await renderApp('/checkout')
    await screen.findByTestId('checkout-total')
    await fillShipping()
    await userEvent.click(screen.getByRole('button', { name: 'Place order' }))
    await screen.findByRole('alert')
    expect(Object.keys(sent as object)).toEqual(['shipping'])
  })

  it('stock drops on the product page after the purchase', async () => {
    signInAs('averyp')
    shopping.seedCart('user-16', [{ productId: 6, quantity: 3 }]) // stock 4
    const { router } = await renderApp('/checkout')
    await screen.findByTestId('checkout-total')
    await fillShipping()
    await userEvent.click(screen.getByRole('button', { name: 'Place order' }))
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/orders\/.+/))
    await router.navigate({ to: '/products/$productId', params: { productId: '6' } })
    expect((await screen.findAllByText('Only 1 left')).length).toBeGreaterThan(0)
  })

  it('past orders show the prices they were bought at', async () => {
    signInAs('averyp')
    shopping.seedCart('user-16', [{ productId: 2, quantity: 1 }])
    const { router } = await renderApp('/checkout')
    await screen.findByTestId('checkout-total')
    await fillShipping()
    await userEvent.click(screen.getByRole('button', { name: 'Place order' }))
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/orders\/.+/))

    await router.navigate({ to: '/orders' })
    await userEvent.click(await screen.findByRole('link', { name: /Order #/ }))
    expect(await screen.findByText('groceries item 02')).toBeInTheDocument()
    expect(screen.getByTestId('order-total')).toHaveTextContent('$18.00')
  })

  it('shows what to fix and creates nothing when the shipping details are invalid', async () => {
    signInAs('averyp')
    shopping.seedCart('user-16', [{ productId: 2, quantity: 1 }])
    await renderApp('/checkout')
    await screen.findByTestId('checkout-total')
    await userEvent.click(screen.getByRole('button', { name: 'Place order' }))
    expect(await screen.findByText('Enter your full name (2–80 characters).')).toBeInTheDocument()
    expect(screen.getByText('Enter a valid phone number.')).toBeInTheDocument()
    expect(mine()).toEqual([])
    expect(shopping.cartOf('user-16')).toHaveLength(1)
  })

  it('an empty cart goes back to the cart page', async () => {
    signInAs('averyp')
    const { router } = await renderApp('/checkout')
    await waitFor(() => expect(router.state.location.pathname).toBe('/cart'))
  })

  it('a shortage on the server is explained by its code and changes nothing', async () => {
    signInAs('averyp')
    shopping.seedCart('user-16', [{ productId: 2, quantity: 5 }])
    await renderApp('/checkout')
    await screen.findByTestId('checkout-total')
    shopping.setServerStock(2, 2) // someone else bought most of it meanwhile
    await fillShipping()
    await userEvent.click(screen.getByRole('button', { name: 'Place order' }))
    expect(
      await screen.findByText(
        /Some items are no longer available in the quantity you chose\. Review your cart\./,
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Not enough stock for groceries item 02')).toBeInTheDocument()
    expect(mine()).toEqual([])
    expect(shopping.cartOf('user-16')[0]?.quantity).toBe(5)
  })

  it('disables the button while the order is being placed', async () => {
    signInAs('averyp')
    shopping.seedCart('user-16', [{ productId: 2, quantity: 1 }])
    let release: () => void = () => undefined
    const gate = new Promise<void>((resolve) => (release = resolve))
    server.use(
      http.post('http://localhost/api/orders', async () => {
        await gate
        return HttpResponse.json(
          { code: 'cart_empty', message: 'Your cart is empty' },
          { status: 422 },
        )
      }),
    )
    await renderApp('/checkout')
    await screen.findByTestId('checkout-total')
    await fillShipping()
    await userEvent.click(screen.getByRole('button', { name: 'Place order' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Place order' })).toBeDisabled())
    release()
  })

  it('Cart → Checkout and the cart summary lead to the checkout page', async () => {
    signInAs('averyp')
    shopping.seedCart('user-16', [{ productId: 2, quantity: 1 }])
    const { router } = await renderApp('/cart')
    const checkout = (await screen.findAllByRole('button', { name: 'Checkout' }))[0]!
    await userEvent.click(checkout)
    await waitFor(() => expect(router.state.location.pathname).toBe('/checkout'))
  })
})

describe('orders (EX-6)', () => {
  const seedOrder = (userId: string, productId = 2) => {
    shopping.seedCart(userId, [{ productId, quantity: 1 }])
    const reply = shopping.placeOrder(userId, {
      fullName: 'Someone',
      address: '1 Main Street',
      city: 'Izmir',
      phone: '5551112233',
    })
    return (reply.body as { data: { id: string } }).data
  }

  it('lists only your own orders, with an empty state otherwise', async () => {
    signInAs('averyp')
    seedOrder('user-1')
    await renderApp('/orders')
    expect(await screen.findByText('You have not placed any orders yet')).toBeInTheDocument()
  })

  it('lists your orders from the server', async () => {
    signInAs('averyp')
    seedOrder('user-16', 2)
    seedOrder('user-16', 5)
    await renderApp('/orders')
    expect(await screen.findAllByRole('link', { name: /Order #/ })).toHaveLength(2)
  })

  it('opens your order and shows 404 for someone else’s', async () => {
    signInAs('averyp')
    const own = seedOrder('user-16')
    const theirs = seedOrder('user-1')
    const view = await renderApp(`/orders/${own.id}`)
    expect(await screen.findByText('groceries item 02')).toBeInTheDocument()
    expect(screen.queryByText('Thank you, your order is placed!')).not.toBeInTheDocument()
    view.unmount()

    await renderApp(`/orders/${theirs.id}`)
    expect(await screen.findByText('Page not found')).toBeInTheDocument()
    expect(screen.queryByText('groceries item 02')).not.toBeInTheDocument()
  })
})
