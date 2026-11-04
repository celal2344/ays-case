import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { signInAs } from '@/test/auth'
import { shopping } from '@/test/msw/handlers'
import { renderApp } from '@/test/render'
import { only, recordRequests } from '@/test/requests'

describe('reviews: one delete confirm is one request (spam-click guards)', () => {
  it('a double click on the delete confirm sends one DELETE', async () => {
    signInAs('averyp')
    shopping.createReview('user-16', 2, { rating: 4, comment: 'Worth every cent, really.' })
    const requests = recordRequests()
    await renderApp('/products/2')
    await userEvent.click(await screen.findByRole('button', { name: 'Delete review' }))
    const confirm = await screen.findByRole('button', { name: 'Delete' })
    fireEvent.click(confirm)
    fireEvent.click(confirm)

    await waitFor(() =>
      expect(screen.queryByText('Worth every cent, really.')).not.toBeInTheDocument(),
    )
    expect(only(requests, 'DELETE /api/reviews')).toHaveLength(1)
  })
})
