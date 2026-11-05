import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'

import { signInAs } from '@/test/auth'
import { serveCatalog } from '@/test/catalog'
import { shopping } from '@/test/msw/handlers'
import { server } from '@/test/msw/server'
import { renderApp } from '@/test/render'

/** The mocked server's cart for a user; the app writes to it through the API. */
const cartOf = (userId: string) => shopping.cartOf(userId)
const seed = (userId: string, ...lines: [productId: number, quantity: number][]) =>
  shopping.seedCart(
    userId,
    lines.map(([productId, quantity]) => ({ productId, quantity })),
  )

describe('cart (CART-1..4)', () => {
  it('CART-1: Add to cart on a card swaps the button for the stepper, whose minus is a trash at 1', async () => {
    signInAs('averyp')
    await renderApp('/products')
    const card = async () => (await screen.findByText('beauty item 01')).closest('li')!
    await userEvent.click(within(await card()).getByRole('button', { name: 'Add to cart' }))
    await waitFor(() =>
      expect(cartOf('user-16')).toEqual([expect.objectContaining({ productId: 1, quantity: 1 })]),
    )

    // the Add to cart button is gone; the card now has the stepper
    expect(
      within(await card()).queryByRole('button', { name: 'Add to cart' }),
    ).not.toBeInTheDocument()
    await userEvent.click(within(await card()).getByRole('button', { name: 'Increase quantity' }))
    await waitFor(() => expect(cartOf('user-16')[0]?.quantity).toBe(2))
    expect(within(await card()).getByRole('textbox', { name: 'Quantity' })).toHaveValue('2')
    expect(await screen.findByRole('link', { name: 'Cart, 2 items' })).toBeInTheDocument()

    await userEvent.click(within(await card()).getByRole('button', { name: 'Decrease quantity' }))
    expect(within(await card()).queryByRole('button', { name: 'Decrease quantity' })).toBeNull()
    await userEvent.click(within(await card()).getByRole('button', { name: 'Remove from cart' }))
    await waitFor(() => expect(cartOf('user-16')).toEqual([]))
    expect(within(await card()).getByRole('button', { name: 'Add to cart' })).toBeInTheDocument()
  })

  it('the card stepper cannot go above stock', async () => {
    signInAs('averyp')
    await renderApp('/products')
    const card = async () => (await screen.findByText('smartphones item 06')).closest('li')!
    await userEvent.click(within(await card()).getByRole('button', { name: 'Add to cart' })) // stock 4
    const quantity = within(await card()).getByRole('textbox', { name: 'Quantity' })
    await userEvent.clear(quantity)
    await userEvent.type(quantity, '99')
    expect(quantity).toHaveValue('4')
    expect(within(await card()).getByRole('button', { name: 'Increase quantity' })).toBeDisabled()
    await waitFor(() => expect(cartOf('user-16')[0]?.quantity).toBe(4))
  })

  it('CART-1: Add to cart on the detail page adds one and shows no quantity before that', async () => {
    signInAs('averyp')
    await renderApp('/products/2')
    await screen.findAllByRole('button', { name: 'Add to cart' })
    expect(screen.queryByRole('textbox', { name: 'Quantity' })).not.toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button', { name: 'Add to cart' })[0]!)
    await waitFor(() =>
      expect(cartOf('user-16')).toEqual([expect.objectContaining({ productId: 2, quantity: 1 })]),
    )
    expect(await screen.findByText('groceries item 02 was added to your cart.')).toBeInTheDocument()
  })

  it('never lets the cart exceed stock: the in-cart stepper stops at the stock', async () => {
    signInAs('averyp')
    await renderApp('/products/6') // stock 4
    const add = (await screen.findAllByRole('button', { name: 'Add to cart' }))[0]!
    await userEvent.click(add)
    await waitFor(() => expect(cartOf('user-16')[0]?.quantity).toBe(1))
    const quantity = await screen.findByRole('textbox', { name: 'Quantity' }) // now the in-cart row
    await userEvent.clear(quantity)
    await userEvent.type(quantity, '99')
    expect(quantity).toHaveValue('4')
    const plus = screen.getByRole('button', { name: 'Increase quantity' })
    await waitFor(() => expect(cartOf('user-16')[0]?.quantity).toBe(4))
    expect(plus).toBeDisabled()
  })

  it('Buy now adds the product and opens checkout', async () => {
    signInAs('averyp')
    const { router } = await renderApp('/products/2')
    await userEvent.click(await screen.findByRole('button', { name: 'Buy now' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/checkout'))
    await waitFor(() => expect(cartOf('user-16')[0]?.productId).toBe(2))
  })

  it('signed out: Add to cart goes to login, and after signing in the item is in the cart', async () => {
    const { router } = await renderApp('/products/2')
    await userEvent.click((await screen.findAllByRole('button', { name: 'Add to cart' }))[0]!)
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(router.state.location.search).toEqual({ redirect: '/products/2' })
    expect(sessionStorage.getItem('ays-case:v1:pending-action')).toContain('"productId":2')

    await userEvent.click(screen.getByRole('button', { name: 'Fill user' }))
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/products/2'))
    await waitFor(() => expect(cartOf('user-16')).toHaveLength(1))
    await waitFor(() => expect(cartOf('user-16')[0]).toMatchObject({ productId: 2, quantity: 1 }))
    expect(sessionStorage.getItem('ays-case:v1:pending-action')).toBeNull()
  })

  it('CART-4: carts are per user; the header badge follows the signed-in user', async () => {
    seed('user-1', [2, 3]) // emilys
    seed('user-16', [4, 1]) // averyp
    signInAs('averyp')
    await renderApp('/cart')
    expect(await screen.findByText('beauty item 04')).toBeInTheDocument()
    expect(screen.queryByText('groceries item 02')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Cart, 1 items' })).toBeInTheDocument()
  })

  it('/cart is protected', async () => {
    const { router } = await renderApp('/cart')
    expect(router.state.location.pathname).toBe('/login')
    expect(router.state.location.search).toEqual({ redirect: '/cart' })
  })
})

describe('cart page', () => {
  it('shows an empty state with a link to the shop', async () => {
    signInAs('averyp')
    await renderApp('/cart')
    expect(await screen.findByText('Your cart is empty')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Browse products' })).toHaveAttribute(
      'href',
      '/products',
    )
  })

  it('CART-2: the stepper clamps to stock; totals use catalog prices', async () => {
    seed('user-16', [6, 1]) // $60, 10% off, stock 4 → $54 each
    signInAs('averyp')
    await renderApp('/cart')
    const quantity = await screen.findByRole('textbox', { name: 'Quantity' })
    await userEvent.clear(quantity)
    await userEvent.type(quantity, '99')
    expect(quantity).toHaveValue('4')
    await waitFor(() => expect(cartOf('user-16')[0]?.quantity).toBe(4))
    expect(screen.getByTestId('cart-total')).toHaveTextContent('$216.00') // 4 × $54
    await userEvent.click(screen.getByRole('button', { name: 'Decrease quantity' }))
    expect(screen.getByTestId('cart-total')).toHaveTextContent('$162.00')
    await waitFor(() => expect(cartOf('user-16')[0]?.quantity).toBe(3)) // sent once the clicking stops
  })

  it('shows subtotal, discount and total', async () => {
    seed('user-16', [2, 1]) // $20 at 10% off
    signInAs('averyp')
    await renderApp('/cart')
    await screen.findByTestId('cart-total')
    expect(screen.getByTestId('cart-total')).toHaveTextContent('$18.00')
    expect(screen.getByText('Subtotal').nextSibling).toHaveTextContent('$20.00')
    expect(screen.getByText('Discount').nextSibling).toHaveTextContent('$2.00')
  })

  it('CART-3: removes a line, and clears the cart only after confirming', async () => {
    seed('user-16', [2, 1], [4, 1])
    signInAs('averyp')
    await renderApp('/cart')
    const row = (await screen.findByText('groceries item 02')).closest('li')!
    await userEvent.click(within(row).getByRole('button', { name: 'Remove from cart' }))
    await waitFor(() => expect(cartOf('user-16').map((l) => l.productId)).toEqual([4]))

    await userEvent.click(screen.getByRole('button', { name: 'Clear cart' }))
    expect(cartOf('user-16')).toHaveLength(1) // not yet: waiting for confirmation
    const dialog = await screen.findByRole('alertdialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Clear cart' }))
    expect(await screen.findByText('Your cart is empty')).toBeInTheDocument()
    await waitFor(() => expect(cartOf('user-16')).toEqual([]))
  })

  it('drops lines whose product was deleted and tells the user once', async () => {
    seed('user-16', [2, 1], [4, 1])
    serveCatalog((products) => products.filter((p) => p.id !== 2))
    signInAs('averyp')
    await renderApp('/cart')
    expect(await screen.findByText('beauty item 04')).toBeInTheDocument()
    await waitFor(() => expect(cartOf('user-16').map((l) => l.productId)).toEqual([4]))
    expect(await screen.findAllByText(/no longer available and were removed/)).toHaveLength(1)
  })

  it('reflects price and stock changes made in the catalog', async () => {
    seed('user-16', [2, 5])
    serveCatalog((products) =>
      products.map((p) =>
        p.id === 2 ? { ...p, priceCents: 10000, discountPercentage: 0, stock: 2 } : p,
      ),
    )
    signInAs('averyp')
    await renderApp('/cart')
    expect(await screen.findByRole('textbox', { name: 'Quantity' })).toHaveValue('2') // 5 → stock 2
    expect(screen.getByTestId('cart-total')).toHaveTextContent('$200.00')
  })

  it('blocks checkout while a line is out of stock and excludes it from the total', async () => {
    seed('user-16', [1, 1], [3, 1])
    signInAs('averyp')
    await renderApp('/cart')
    expect(
      await screen.findByText('This product is out of stock. Remove it to continue.'),
    ).toBeInTheDocument()
    expect(
      screen.getAllByRole('button', { name: 'Checkout' }).every((b) => b.hasAttribute('disabled')),
    ).toBe(true)
    expect(screen.getByTestId('cart-total')).toHaveTextContent('$10.00')
  })

  it('CART-4: the cart lives on the server, so a fresh app (another device) shows it', async () => {
    seed('user-16', [2, 2])
    signInAs('averyp')
    await renderApp('/cart')
    expect(await screen.findByText('groceries item 02')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Quantity' })).toHaveValue('2')
  })

  it('a refused change rolls back: the quantity returns to what the server holds', async () => {
    seed('user-16', [2, 2])
    signInAs('averyp')
    server.use(
      http.put('http://localhost/api/cart/items/2', () =>
        HttpResponse.json({ code: 'server_error', message: 'boom' }, { status: 500 }),
      ),
    )
    await renderApp('/cart')
    await userEvent.click(await screen.findByRole('button', { name: 'Increase quantity' }))
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Quantity' })).toHaveValue('2'))
    expect(cartOf('user-16')[0]?.quantity).toBe(2)
  })
})
