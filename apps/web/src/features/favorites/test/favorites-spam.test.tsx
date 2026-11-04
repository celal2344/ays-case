import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { signInAs } from '@/test/auth'
import { shopping } from '@/test/msw/handlers'
import { renderApp } from '@/test/render'
import { only, recordRequests } from '@/test/requests'

const mine = () => shopping.favoritesOf('user-16')
const heart = async (name: string) => {
  const card = (await screen.findByText('beauty item 01')).closest('li')!
  return within(card).getByRole('button', { name })
}

describe('favorites: coalesced toggles (spam-click guards)', () => {
  it('on then off quickly ends off, with the requests sent one after the other', async () => {
    signInAs('averyp')
    const requests = recordRequests()
    await renderApp('/products')
    const button = await heart('Add beauty item 01 to favorites')
    fireEvent.click(button)
    fireEvent.click(button)

    await waitFor(() => expect(only(requests, 'DELETE /api/favorites')).toHaveLength(1))
    await waitFor(() => expect(mine()).toEqual([]))
    expect(only(requests, 'PUT /api/favorites')).toEqual(['PUT /api/favorites/1'])
    expect(await heart('Add beauty item 01 to favorites')).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getAllByText('Removed from favorites.')).toHaveLength(1)
  })

  it('three quick toggles send one request and end on', async () => {
    signInAs('averyp')
    const requests = recordRequests()
    await renderApp('/products')
    const button = await heart('Add beauty item 01 to favorites')
    fireEvent.click(button)
    fireEvent.click(button)
    fireEvent.click(button)

    await waitFor(() => expect(mine()).toEqual([1]))
    expect(await heart('Remove beauty item 01 from favorites')).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(only(requests, 'PUT /api/favorites')).toEqual(['PUT /api/favorites/1'])
    expect(only(requests, 'DELETE /api/favorites')).toEqual([])
    expect(screen.getAllByText('Added to favorites.')).toHaveLength(1)
  })
})
