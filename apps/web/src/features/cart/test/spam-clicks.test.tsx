import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { signInAs } from '@/test/auth'
import { shopping } from '@/test/msw/handlers'
import { renderApp } from '@/test/render'
import { only, recordRequests } from '@/test/requests'

const cartOf = () => shopping.cartOf('user-16')
const seed = (...lines: [productId: number, quantity: number][]) =>
  shopping.seedCart(
    'user-16',
    lines.map(([productId, quantity]) => ({ productId, quantity })),
  )

describe('cart: one click is one request (spam-click guards)', () => {
  it('five fast clicks on Add to cart send one request and leave one toast', async () => {
    signInAs('averyp')
    const requests = recordRequests()
    await renderApp('/products')
    const card = (await screen.findByText('beauty item 01')).closest('li')!
    const button = within(card).getByRole('button', { name: 'Add to cart' })
    for (let i = 0; i < 5; i++) fireEvent.click(button)

    await waitFor(() => expect(cartOf()).toEqual([expect.objectContaining({ productId: 1 })]))
    expect(await screen.findByText('beauty item 01 was added to your cart.')).toBeInTheDocument()
    expect(only(requests, 'POST /api/cart/items')).toHaveLength(1)
    expect(cartOf()[0]?.quantity).toBe(1)
  })

  it('shows a busy button while the add is sending', async () => {
    signInAs('averyp')
    await renderApp('/products/2')
    const button = await screen.findByRole('button', { name: 'Add to cart' })
    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button).toBeDisabled()
    await waitFor(() => expect(button).not.toHaveAttribute('aria-busy'))
  })

  it('at the stock cap the button says so and sends nothing', async () => {
    seed([6, 4]) // product 6 has 4 in stock
    signInAs('averyp')
    const requests = recordRequests()
    await renderApp('/products/6')
    const button = await screen.findByRole('button', { name: 'Max in cart' })
    expect(button).toBeDisabled()
    fireEvent.click(button)
    expect(only(requests, 'POST /api/cart/items')).toEqual([])
    expect(screen.queryByText(/is what is in your cart/)).not.toBeInTheDocument()
  })

  it('quantity clicks update the screen at once and send only the last value', async () => {
    seed([6, 1])
    signInAs('averyp')
    const requests = recordRequests()
    await renderApp('/cart')
    const plus = await screen.findByRole('button', { name: 'Increase quantity' })
    await userEvent.click(plus)
    await userEvent.click(plus)
    expect(screen.getByRole('textbox', { name: 'Quantity' })).toHaveValue('3') // shown before any request
    expect(only(requests, 'PUT /api/cart/items')).toEqual([])
    await userEvent.click(plus)
    expect(screen.getByRole('textbox', { name: 'Quantity' })).toHaveValue('4')

    await waitFor(() => expect(cartOf()[0]?.quantity).toBe(4))
    expect(only(requests, 'PUT /api/cart/items')).toEqual(['PUT /api/cart/items/6'])
  })

  it('a second click on Remove does not send a second DELETE', async () => {
    seed([2, 1], [4, 1])
    signInAs('averyp')
    const requests = recordRequests()
    await renderApp('/cart')
    const remove = await screen.findByRole('button', { name: 'Remove groceries item 02' })
    fireEvent.click(remove)
    fireEvent.click(remove)

    await waitFor(() => expect(cartOf().map((l) => l.productId)).toEqual([4]))
    expect(only(requests, 'DELETE /api/cart/items')).toEqual(['DELETE /api/cart/items/2'])
  })

  it('a double click on Clear cart in the dialog sends one DELETE', async () => {
    seed([2, 1], [4, 1])
    signInAs('averyp')
    const requests = recordRequests()
    await renderApp('/cart')
    fireEvent.click(await screen.findByRole('button', { name: 'Clear cart' }))
    const dialog = await screen.findByRole('alertdialog')
    const confirm = within(dialog).getByRole('button', { name: 'Clear cart' })
    fireEvent.click(confirm)
    fireEvent.click(confirm)

    expect(await screen.findByText('Your cart is empty')).toBeInTheDocument()
    expect(only(requests, 'DELETE /api/cart')).toEqual(['DELETE /api/cart'])
  })
})
