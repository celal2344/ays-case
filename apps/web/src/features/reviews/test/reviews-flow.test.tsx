import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { signInAs } from '@/test/auth'
import { renderApp } from '@/test/render'

import { useReviewsStore } from '../store'

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

  it('REV-3: a signed-in user adds a review that shows up (the API figures stay) and survives reload', async () => {
    signInAs('averyp')
    await openReviews()
    await writeReview(3)
    expect(await screen.findByText(comment)).toBeInTheDocument()
    expect(screen.getByText('Avery Perez')).toBeInTheDocument()
    expect(screen.getByTestId('review-average')).toHaveTextContent('3.0') // computed by the API; a browser-only review does not change it
    // one review per user: the form is replaced by the user's own review
    expect(screen.queryByRole('button', { name: 'Submit review' })).not.toBeInTheDocument()
    expect(
      JSON.parse(localStorage.getItem('ays-case:v1:reviews') ?? '{}').state.byProduct['2'],
    ).toHaveLength(1)
  })

  it('REV-3: validates the rating and the comment length', async () => {
    signInAs('averyp')
    await openReviews()
    await userEvent.type(screen.getByLabelText('Your review'), 'too short')
    await userEvent.click(screen.getByRole('button', { name: 'Submit review' }))
    expect(await screen.findByText('Please choose a rating.')).toBeInTheDocument()
    expect(screen.getByText('Write between 10 and 500 characters.')).toBeInTheDocument()
    expect(useReviewsStore.getState().byProduct[2]).toBeUndefined()
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
    expect(screen.queryByText('Updated: still great, more detail.')).not.toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Submit review' })).toBeInTheDocument()
  })

  it("REV-4: other users cannot edit or delete someone else's review, an admin can delete any", async () => {
    useReviewsStore.getState().add({
      productId: 2,
      userId: 'user-16',
      authorName: 'Avery Perez',
      rating: 2,
      comment: 'Not for me, sadly.',
    })
    signInAs('emilys') // a different user, who is an admin
    await openReviews()
    expect(await screen.findByText('Not for me, sadly.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit your review' })).not.toBeInTheDocument()

    // admin: delete the local review and hide the seeded one
    for (const text of ['Not for me, sadly.', 'Great!']) {
      const card = screen.getByText(text).closest('li')!
      await userEvent.click(within(card).getByRole('button', { name: 'Delete review' }))
      await userEvent.click(await screen.findByRole('button', { name: 'Delete' }))
      expect(screen.queryByText(text)).not.toBeInTheDocument()
    }
    expect(
      await screen.findByText('No reviews yet. Be the first to write one.'),
    ).toBeInTheDocument()
  })

  it('REV-4: a plain user has no delete button on the seeded review', async () => {
    signInAs('averyp')
    await openReviews()
    expect(await screen.findByText('Great!')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete review' })).not.toBeInTheDocument()
  })

  it('REV-1: sorts by rating', async () => {
    useReviewsStore.getState().add({
      productId: 2,
      userId: 'user-16',
      authorName: 'Low Rater',
      rating: 1,
      comment: 'Not good at all.',
    })
    await openReviews()
    await screen.findByText('Not good at all.')
    const order = () =>
      screen
        .getAllByRole('listitem')
        .map((li) => li.textContent ?? '')
        .filter((t) => /Great!|Not good/.test(t))
    expect(order()[0]).toContain('Not good') // newest first: the local one was just written
    await userEvent.click(screen.getByRole('combobox', { name: 'Sort reviews' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Highest rating' }))
    expect(order()[0]).toContain('Great!')
  })

  it('the header rating comes from the API and opens the reviews tab', async () => {
    useReviewsStore.getState().add({
      productId: 2,
      userId: 'user-16',
      authorName: 'Avery Perez',
      rating: 3,
      comment: 'It is okay overall.',
    })
    await renderApp('/products/2')
    const link = await screen.findByRole('button', { name: /3\.0.*1 review/ })
    await userEvent.click(link)
    expect(await screen.findByTestId('review-average')).toBeInTheDocument()
  })
})
