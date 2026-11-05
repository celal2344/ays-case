import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { signInAs } from '@/test/auth'
import { shopping } from '@/test/msw/handlers'
import { renderApp } from '@/test/render'

const shipping = {
  fullName: 'Avery Perez',
  address: '1 Main Street',
  city: 'Izmir',
  phone: '5551112233',
}

function seedOrder(productIds: number[]) {
  shopping.seedCart(
    'user-16',
    productIds.map((productId) => ({ productId, quantity: 1 })),
  )
  shopping.placeOrder('user-16', shipping)
}

describe('orders page', () => {
  it('shows a card per order with the facts, the status and the product thumbnails', async () => {
    signInAs('averyp')
    seedOrder([2, 5])
    await renderApp('/orders')
    const card = (await screen.findAllByRole('article'))[0]!
    expect(within(card).getByText('Order date')).toBeInTheDocument()
    expect(within(card).getByText('Order received')).toBeInTheDocument()
    expect(within(card).getByText('2 items ordered')).toBeInTheDocument()
    expect(within(card).getAllByRole('img')).toHaveLength(2)
    expect(screen.getByText('1 order')).toBeInTheDocument()
  })

  it('shows up to five thumbnails and "+N" for the rest', async () => {
    signInAs('averyp')
    seedOrder([1, 2, 5, 7, 8, 9, 10])
    await renderApp('/orders')
    const card = (await screen.findAllByRole('article'))[0]!
    expect(within(card).getAllByRole('img')).toHaveLength(5)
    expect(within(card).getByText('+2')).toBeInTheDocument()
  })

  it('filters the orders by product name, in the browser', async () => {
    signInAs('averyp')
    seedOrder([2])
    seedOrder([5])
    await renderApp('/orders')
    expect(await screen.findAllByRole('article')).toHaveLength(2)
    await userEvent.type(screen.getByLabelText('Search products in your orders'), 'item 05')
    expect(screen.getAllByRole('article')).toHaveLength(1)
    await userEvent.clear(screen.getByLabelText('Search products in your orders'))
    await userEvent.type(screen.getByLabelText('Search products in your orders'), 'nothing like it')
    expect(await screen.findByText('No order contains "nothing like it".')).toBeInTheDocument()
  })

  it('"Review" lists the order’s products; a reviewed one says so, the others open the form', async () => {
    signInAs('averyp')
    seedOrder([2, 5])
    shopping.createReview('user-16', 2, { rating: 5, comment: 'Written earlier on a phone.' })
    await renderApp('/orders')
    await userEvent.click(await screen.findByRole('button', { name: 'Review' }))
    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByText('Reviewed')).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: /Review: groceries item 02/ })).toBeNull()

    await userEvent.click(within(dialog).getByRole('button', { name: /Review: groceries item 05/ }))
    await userEvent.click(within(dialog).getByRole('radio', { name: '4 stars' }))
    await userEvent.type(
      within(dialog).getByLabelText('Your review'),
      'Really happy with this purchase.',
    )
    await userEvent.click(within(dialog).getByRole('button', { name: 'Submit review' }))
    await waitFor(() => expect(within(dialog).getAllByText('Reviewed')).toHaveLength(2))
  })
})
