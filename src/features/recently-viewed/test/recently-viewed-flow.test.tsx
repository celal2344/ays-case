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

  it('the product page shows the others newest first, without the current one; Clear empties it', async () => {
    signInAs('averyp')
    useRecentlyViewedStore.getState().record('16', 1)
    useRecentlyViewedStore.getState().record('16', 4)
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
  })

  it('the shop list has no recently viewed section', async () => {
    signInAs('averyp')
    useRecentlyViewedStore.getState().record('16', 1)
    await renderApp('/products')
    await screen.findByRole('heading', { name: 'Products' })
    expect(screen.queryByRole('region', { name: 'Recently viewed' })).not.toBeInTheDocument()
  })
})
