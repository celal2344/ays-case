import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { shopping } from '@/test/msw/handlers'
import { useSearchStore } from '@/features/search/store'
import { signInAs } from '@/test/auth'
import { renderApp } from '@/test/render'

const box = () => screen.findByRole('combobox', { name: 'Search products' })

describe('search focus panel', () => {
  it('a new visitor sees suggested searches and best deals, never an empty box', async () => {
    signInAs('averyp')
    await renderApp('/orders')
    await userEvent.click(await box())
    const suggested = (await screen.findByRole('heading', { name: 'Suggested searches' })).closest(
      'section',
    )!
    expect(within(suggested).getByRole('button', { name: 'even' })).toBeInTheDocument()
    const deals = screen.getByRole('heading', { name: 'Best deals' }).closest('section')!
    expect(within(deals).getAllByRole('link')).toHaveLength(4)
    expect(screen.queryByRole('heading', { name: 'Recently viewed' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Recent searches' })).not.toBeInTheDocument()
  })

  it('shows recently viewed and recent searches when there are some', async () => {
    signInAs('averyp')
    shopping.seedViewed('user-16', [1])
    useSearchStore.getState().record('mascara')
    await renderApp('/orders')
    await userEvent.click(await box())
    const viewed = (await screen.findByRole('heading', { name: 'Recently viewed' })).closest(
      'section',
    )!
    expect(within(viewed).getByRole('link', { name: 'beauty item 01' })).toBeInTheDocument()
    const recent = screen.getByRole('heading', { name: 'Recent searches' }).closest('section')!
    expect(within(recent).getByRole('button', { name: 'mascara' })).toBeInTheDocument()

    await userEvent.click(
      within(recent).getByRole('button', { name: 'Remove “mascara” from recent searches' }),
    )
    expect(screen.queryByRole('heading', { name: 'Recent searches' })).not.toBeInTheDocument()
    expect(useSearchStore.getState().recent).toEqual([])
  })

  it('a recent-search chip runs the search; a suggested chip does too but is not remembered', async () => {
    signInAs('averyp')
    useSearchStore.getState().record('item 07')
    const { router } = await renderApp('/orders')
    await userEvent.click(await box())
    await userEvent.click(await screen.findByRole('button', { name: 'item 07' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/products'))
    expect(router.state.location.search).toMatchObject({ q: 'item 07' })

    await userEvent.clear(await box())
    await userEvent.click(await screen.findByRole('button', { name: 'odd' }))
    await waitFor(() => expect(router.state.location.search).toMatchObject({ q: 'odd' }))
    expect(useSearchStore.getState().recent).toEqual(['item 07'])
  })

  it('Enter records the search; typing swaps the panel for suggestions and clearing brings it back', async () => {
    signInAs('averyp')
    await renderApp('/orders')
    const input = await box()
    await userEvent.click(input)
    await screen.findByRole('heading', { name: 'Best deals' })
    await userEvent.type(input, 'beau')
    await screen.findByRole('listbox')
    expect(screen.queryByRole('heading', { name: 'Best deals' })).not.toBeInTheDocument()
    await userEvent.clear(input)
    expect(await screen.findByRole('heading', { name: 'Best deals' })).toBeInTheDocument()
    await userEvent.type(input, 'mascara{Enter}')
    expect(useSearchStore.getState().recent).toEqual(['mascara'])
  })

  it('Escape closes the panel; ArrowDown moves into it', async () => {
    signInAs('averyp')
    await renderApp('/orders')
    const input = await box()
    await userEvent.click(input)
    await screen.findByRole('heading', { name: 'Best deals' })
    await userEvent.keyboard('{ArrowDown}')
    expect(document.activeElement).not.toBe(input)
    expect(document.activeElement?.closest('section')).not.toBeNull()
    await userEvent.click(input)
    await userEvent.keyboard('{Escape}')
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Best deals' })).not.toBeInTheDocument(),
    )
  })
})
