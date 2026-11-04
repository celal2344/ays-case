import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { signInAs } from '@/test/auth'
import { shopping } from '@/test/msw/handlers'
import { renderApp } from '@/test/render'
import { only, recordRequests } from '@/test/requests'

import { useGuestViewedStore } from '../guest-store'

describe('recently viewed strip', () => {
  it('records a visit to a product page', async () => {
    signInAs('averyp')
    await renderApp('/products/2')
    await screen.findByRole('heading', { name: 'groceries item 02' })
    await waitFor(() => expect(shopping.viewedOf('user-16')).toEqual([2]))
  })

  it('one visit sends one PUT /recently-viewed', async () => {
    signInAs('averyp')
    const requests = recordRequests()
    await renderApp('/products/2')
    await screen.findByRole('heading', { name: 'groceries item 02' })
    await waitFor(() => expect(shopping.viewedOf('user-16')).toEqual([2]))
    expect(only(requests, 'PUT /api/recently-viewed')).toEqual(['PUT /api/recently-viewed/2'])
  })

  it('the product page shows the others newest first, without the current one; Clear empties it', async () => {
    signInAs('averyp')
    shopping.seedViewed('user-16', [4, 1])
    await renderApp('/products/2')
    const strip = await screen.findByRole('region', { name: 'Recently viewed' })
    const titles = within(strip)
      .getAllByRole('link')
      .map((a) => a.textContent)
    expect(titles[0]).toContain('beauty item 04')
    expect(titles[1]).toContain('beauty item 01')
    expect(titles).toHaveLength(2) // product 2 itself is recorded but not listed
    await userEvent.click(within(strip).getByRole('button', { name: 'Clear' }))
    expect(screen.queryByRole('region', { name: 'Recently viewed' })).not.toBeInTheDocument()
    await waitFor(() => expect(shopping.viewedOf('user-16')).toEqual([]))
  })

  it('a signed-out visitor gets an in-memory list that is never sent to the server', async () => {
    useGuestViewedStore.getState().record(1)
    await renderApp('/products/2')
    const strip = await screen.findByRole('region', { name: 'Recently viewed' })
    expect(within(strip).getAllByRole('link')[0]).toHaveTextContent('beauty item 01')
    expect(shopping.viewedOf('user-16')).toEqual([])
    expect(useGuestViewedStore.getState().ids).toEqual([2, 1])
  })

  it('the shop list has no recently viewed section', async () => {
    signInAs('averyp')
    shopping.seedViewed('user-16', [1])
    await renderApp('/products')
    await screen.findByRole('heading', { name: 'Products' })
    expect(screen.queryByRole('region', { name: 'Recently viewed' })).not.toBeInTheDocument()
  })
})
