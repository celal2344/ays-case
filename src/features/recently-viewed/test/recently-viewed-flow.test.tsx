import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { signInAs } from '@/test/auth'
import { renderApp } from '@/test/render'

import { useRecentlyViewedStore } from '../store'

describe('recently viewed strip', () => {
  it('records a visit to a product page', async () => {
    signInAs('averyp')
    await renderApp('/products/2')
    await screen.findByRole('heading', { name: 'groceries item 02' })
    expect(useRecentlyViewedStore.getState().byUser['16']).toEqual([2])
  })

  it('/products shows the strip only without filters, and Clear empties it', async () => {
    signInAs('averyp')
    useRecentlyViewedStore.getState().record('16', 1)
    await renderApp('/products')
    const strip = await screen.findByRole('region', { name: 'Recently viewed' })
    expect(within(strip).getByText('beauty item 01')).toBeInTheDocument()
    await userEvent.click(within(strip).getByRole('button', { name: 'Clear' }))
    expect(screen.queryByRole('region', { name: 'Recently viewed' })).not.toBeInTheDocument()
  })

  it('is hidden when a filter is active', async () => {
    signInAs('averyp')
    useRecentlyViewedStore.getState().record('16', 1)
    await renderApp('/products?q=item')
    await screen.findByRole('heading', { name: 'Products' })
    expect(screen.queryByRole('region', { name: 'Recently viewed' })).not.toBeInTheDocument()
  })
})
