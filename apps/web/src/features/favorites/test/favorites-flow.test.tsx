import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { signInAs } from '@/test/auth'
import { renderApp } from '@/test/render'

import { useFavoritesStore } from '../store'

const mine = () => useFavoritesStore.getState().byUser['user-16'] ?? []
const card = async (title: string) => (await screen.findByText(title)).closest('li')!

describe('favorites (heart and page)', () => {
  it('the heart on a card toggles aria-pressed and does not open the product', async () => {
    signInAs('averyp')
    const { router } = await renderApp('/products')
    const heart = within(await card('beauty item 01')).getByRole('button', {
      name: 'Add beauty item 01 to favorites',
    })
    expect(heart).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(heart)
    expect(mine()).toEqual([1])
    expect(
      within(await card('beauty item 01')).getByRole('button', {
        name: 'Remove beauty item 01 from favorites',
      }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(router.state.location.pathname).toBe('/products')
    expect(screen.getByRole('link', { name: 'Favorites, 1 items' })).toBeInTheDocument()
  })

  it('/favorites lists them newest first; un-favoriting removes the card', async () => {
    signInAs('averyp')
    useFavoritesStore.getState().toggle('user-16', 1)
    useFavoritesStore.getState().toggle('user-16', 2)
    await renderApp('/favorites')
    const titles = (await screen.findAllByRole('link', { name: /item 0[12]$/ })).map(
      (a) => a.textContent,
    )
    expect(titles).toEqual(['groceries item 02', 'beauty item 01'])
    await userEvent.click(
      screen.getByRole('button', { name: 'Remove groceries item 02 from favorites' }),
    )
    await waitFor(() => expect(screen.queryByText('groceries item 02')).not.toBeInTheDocument())
    expect(mine()).toEqual([1])
  })

  it('shows an empty state, and drops favorites whose product no longer exists', async () => {
    signInAs('averyp')
    useFavoritesStore.getState().toggle('user-16', 99999)
    await renderApp('/favorites')
    expect(await screen.findByText('You have no favorites yet')).toBeInTheDocument()
  })

  it('signed out: the heart goes to login and the product is a favorite afterwards', async () => {
    const { router } = await renderApp('/products/2')
    await userEvent.click(
      await screen.findByRole('button', { name: 'Add groceries item 02 to favorites' }),
    )
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    await userEvent.click(screen.getByRole('button', { name: 'Fill user' }))
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/products/2'))
    await waitFor(() => expect(mine()).toEqual([2]))
  })

  it('/favorites needs a login', async () => {
    const { router } = await renderApp('/favorites')
    expect(router.state.location.pathname).toBe('/login')
  })
})
