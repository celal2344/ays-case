import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { signInAs } from '@/test/auth'
import { shopping } from '@/test/msw/handlers'
import { renderApp } from '@/test/render'

async function openReviews(route = '/products/2') {
  const utils = await renderApp(route)
  await screen.findByRole('heading', { level: 2, name: /Reviews/ })
  return utils
}

const comment = 'Really happy with this purchase.'

async function writeReview(stars: number, text = comment) {
  await userEvent.click(
    screen.getByRole('radio', { name: stars === 1 ? '1 star' : `${stars} stars` }),
  )
  await userEvent.type(screen.getByLabelText('Your review'), text)
  await userEvent.click(screen.getByRole('button', { name: 'Submit review' }))
}

describe('reviews (REV-1..5)', () => {
  it('REV-1/2: lists the API review with the summary and histogram from the API', async () => {
    await openReviews()
    expect(await screen.findByText('Great!')).toBeInTheDocument()
    expect(screen.getByText('Eleanor Collins')).toBeInTheDocument()
    expect(screen.getByTestId('review-average')).toHaveTextContent('3.0')
    const histogram = screen.getByRole('list', { name: 'Rating distribution' })
    expect(within(histogram).getAllByRole('listitem')).toHaveLength(5)
    expect(within(histogram).getAllByRole('listitem')[2]).toHaveTextContent('3 ★')
    expect(within(histogram).getAllByRole('listitem')[2]).toHaveTextContent('1')
  })

  it('REV-3: a logged-out visitor gets a sign-in prompt instead of the form', async () => {
    await openReviews()
    const panel = within(await screen.findByRole('region', { name: /Reviews/ }))
    expect(await panel.findByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      expect.stringContaining('/login?redirect='),
    )
    expect(screen.queryByRole('button', { name: 'Submit review' })).not.toBeInTheDocument()
  })

  it('REV-3: a review is saved on the server and the headline figures refresh from it', async () => {
    signInAs('averyp')
    await openReviews()
    await writeReview(5)
    expect(await screen.findByText(comment)).toBeInTheDocument()
    expect(screen.getByText('Avery Perez')).toBeInTheDocument()
    // (3 + 5) / 2, computed by the API after the response, not in the browser
    await waitFor(() => expect(screen.getByTestId('review-average')).toHaveTextContent('4.0'))
    expect(screen.getByTestId('review-average').closest('div')).toHaveTextContent('2 reviews')
    // one review per user: the form is replaced by the user's own review
    expect(screen.queryByRole('button', { name: 'Submit review' })).not.toBeInTheDocument()
  })

  it('REV-3: validates the rating and the comment length', async () => {
    signInAs('averyp')
    await openReviews()
    await userEvent.type(screen.getByLabelText('Your review'), 'too short')
    await userEvent.click(screen.getByRole('button', { name: 'Submit review' }))
    expect(await screen.findByText('Please choose a rating.')).toBeInTheDocument()
    expect(screen.getByText('Write between 10 and 500 characters.')).toBeInTheDocument()
  })

  it('REV-3: a second review is refused by the server with a clear message', async () => {
    signInAs('averyp')
    await openReviews()
    // the review exists on the server (another device) but this page was loaded before it
    shopping.createReview('user-16', 2, { rating: 4, comment: 'Written earlier on a phone.' })
    await writeReview(5)
    expect(await screen.findByText('You have already reviewed this product.')).toBeInTheDocument()
  })

  it('REV-4: the author can edit and delete their own review', async () => {
    signInAs('averyp')
    await openReviews()
    await writeReview(5)
    await userEvent.click(await screen.findByRole('button', { name: 'Edit your review' }))
    const box = screen.getByLabelText('Your review')
    await userEvent.clear(box)
    await userEvent.type(box, 'Updated: still great, more detail.')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('Updated: still great, more detail.')).toBeInTheDocument()
    expect(screen.queryByText(comment)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Delete review' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }))
    await waitFor(() =>
      expect(screen.queryByText('Updated: still great, more detail.')).not.toBeInTheDocument(),
    )
    expect(await screen.findByRole('button', { name: 'Submit review' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByTestId('review-average')).toHaveTextContent('3.0'))
  })

  it('REV-4: others cannot edit someone else’s review, and an admin can delete any', async () => {
    shopping.createReview('user-16', 2, { rating: 1, comment: 'Not for me, sadly.' })
    signInAs('emilys') // a different user, who is an admin
    await openReviews()
    expect(await screen.findByText('Not for me, sadly.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit your review' })).not.toBeInTheDocument()

    for (const text of ['Not for me, sadly.', 'Great!']) {
      const card = screen.getByText(text).closest('li')!
      await userEvent.click(within(card).getByRole('button', { name: 'Delete review' }))
      await userEvent.click(await screen.findByRole('button', { name: 'Delete' }))
      await waitFor(() => expect(screen.queryByText(text)).not.toBeInTheDocument())
    }
    expect(
      await screen.findByText('No reviews yet. Be the first to write one.'),
    ).toBeInTheDocument()
  })

  it('REV-4: a plain user has no delete button on someone else’s review', async () => {
    signInAs('averyp')
    await openReviews()
    expect(await screen.findByText('Great!')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete review' })).not.toBeInTheDocument()
  })

  it('REV-5: the verified-buyer badge comes from the server, only for buyers', async () => {
    signInAs('averyp')
    shopping.seedCart('user-16', [{ productId: 2, quantity: 1 }])
    shopping.placeOrder('user-16', {
      fullName: 'Avery Perez',
      address: '1 Main Street',
      city: 'Izmir',
      phone: '5551112233',
    })
    shopping.createReview('user-16', 2, { rating: 5, comment: 'Loved it, really.' })
    shopping.createReview('user-1', 2, { rating: 4, comment: 'Never bought it though.' })
    await openReviews()
    await screen.findByText('Loved it, really.')
    const buyer = screen.getByText('Loved it, really.').closest('li')!
    const other = screen.getByText('Never bought it though.').closest('li')!
    expect(within(buyer).getByText('Verified buyer')).toBeInTheDocument()
    expect(within(other).queryByText('Verified buyer')).not.toBeInTheDocument()
  })

  it('REV-1: sorts by rating', async () => {
    shopping.createReview('user-16', 2, { rating: 1, comment: 'Not good at all.' })
    await openReviews()
    await screen.findByText('Not good at all.')
    const order = () =>
      screen
        .getAllByRole('listitem')
        .map((li) => li.textContent ?? '')
        .filter((t) => /Great!|Not good/.test(t))
    expect(order()[0]).toContain('Not good') // newest first: this one was just written
    await userEvent.click(screen.getByRole('combobox', { name: 'Sort reviews' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Highest rating' }))
    expect(order()[0]).toContain('Great!')
  })

  it('the header rating comes from the API and opens the reviews tab', async () => {
    await renderApp('/products/2')
    const link = await screen.findByRole('button', { name: /3\.0.*1 review/ })
    await userEvent.click(link)
    expect(await screen.findByTestId('review-average')).toBeInTheDocument()
  })
})
