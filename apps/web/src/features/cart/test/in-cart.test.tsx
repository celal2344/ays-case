import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { signInAs } from '@/test/auth'
import { shopping } from '@/test/msw/handlers'
import { renderApp } from '@/test/render'
import { only, recordRequests } from '@/test/requests'

const cartOf = () => shopping.cartOf('user-16')

describe('product page: the in-cart state', () => {
  it('adding switches the row to "In cart" with the stepper, "Go to cart" and "Buy now"', async () => {
    signInAs('averyp')
    await renderApp('/products/2')
    await userEvent.click((await screen.findAllByRole('button', { name: 'Add to cart' }))[0]!)

    expect(await screen.findByText('In cart:')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Buy now' })).not.toBeInTheDocument() // now a link
    expect(screen.getByRole('link', { name: 'Go to cart' })).toHaveAttribute('href', '/cart')
    expect(screen.getByRole('link', { name: 'Buy now' })).toHaveAttribute('href', '/checkout')
  })

  it('plus changes the cart, and a burst sends one request after the debounce', async () => {
    shopping.seedCart('user-16', [{ productId: 2, quantity: 2 }])
    signInAs('averyp')
    const requests = recordRequests()
    await renderApp('/products/2')
    await screen.findByText('In cart:')
    const plus = screen.getAllByRole('button', { name: 'Increase quantity' })[0]!
    await userEvent.click(plus)
    await userEvent.click(plus)

    await waitFor(() => expect(cartOf()[0]?.quantity).toBe(4))
    expect(only(requests, 'PUT /api/cart/items')).toEqual(['PUT /api/cart/items/2'])
  })

  it('the minus at 1 is a trash: it removes the line and brings back "Add to cart"', async () => {
    shopping.seedCart('user-16', [{ productId: 2, quantity: 1 }])
    signInAs('averyp')
    await renderApp('/products/2')
    await screen.findByText('In cart:')
    expect(screen.queryByRole('button', { name: 'Decrease quantity' })).not.toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button', { name: 'Remove from cart' })[0]!)

    await waitFor(() => expect(cartOf()).toEqual([]))
    expect((await screen.findAllByRole('button', { name: 'Add to cart' }))[0]).toBeInTheDocument()
    expect(screen.queryByText('In cart:')).not.toBeInTheDocument()
  })

  it('"Go to cart" navigates to the cart', async () => {
    shopping.seedCart('user-16', [{ productId: 2, quantity: 1 }])
    signInAs('averyp')
    const { router } = await renderApp('/products/2')
    await userEvent.click(await screen.findByRole('link', { name: 'Go to cart' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/cart'))
  })
})

describe('product cards: one title link, controls stay separate', () => {
  it('the card has a single product link, and the heart, add button and stepper are not inside it', async () => {
    signInAs('averyp')
    const { router } = await renderApp('/products')
    const card = (await screen.findByText('groceries item 02')).closest('li')!
    const links = within(card).getAllByRole('link')
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveClass('card-link')
    expect(links[0]).toHaveAccessibleName('groceries item 02')
    expect(card.querySelectorAll('a button')).toHaveLength(0)

    await userEvent.click(within(card).getByRole('button', { name: /to favorites/ }))
    await userEvent.click(within(card).getByRole('button', { name: 'Add to cart' }))
    await userEvent.click(await within(card).findByRole('button', { name: 'Increase quantity' }))
    expect(router.state.location.pathname).toBe('/products')
  })
})
