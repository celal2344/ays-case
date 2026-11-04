import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { signInAs } from '@/test/auth'
import { renderApp } from '@/test/render'

const box = () => screen.findByRole('combobox', { name: 'Search products' })

describe('header search suggestions', () => {
  it('shows products, categories and a search row; ArrowDown + Enter opens the product', async () => {
    signInAs('averyp')
    const { router } = await renderApp('/orders')
    await userEvent.type(await box(), 'beau')
    const list = await screen.findByRole('listbox')
    expect(await within(list).findByText('Categories')).toBeInTheDocument()
    expect(within(list).getByRole('option', { name: /Search for “beau”/ })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/orders')

    await userEvent.keyboard('{ArrowDown}{Enter}')
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/products\/\d+$/))
  })

  it('picking a category goes to the list filtered by it', async () => {
    signInAs('averyp')
    const { router } = await renderApp('/orders')
    await userEvent.type(await box(), 'beau')
    await userEvent.click(await screen.findByRole('option', { name: /Beauty/ }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/products'))
    expect(router.state.location.search).toMatchObject({ category: 'beauty' })
  })

  it('Escape closes the list and keeps the text', async () => {
    signInAs('averyp')
    await renderApp('/orders')
    const input = await box()
    await userEvent.type(input, 'beau')
    await screen.findByRole('listbox')
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument())
    expect(input).toHaveValue('beau')
  })

  it('says so when no product matches, and still offers the search row', async () => {
    signInAs('averyp')
    await renderApp('/orders')
    await userEvent.type(await box(), 'zzzz')
    const list = await screen.findByRole('listbox')
    expect(await within(list).findByText('No products found for “zzzz”')).toBeInTheDocument()
    expect(within(list).getByRole('option', { name: /Search for “zzzz”/ })).toBeInTheDocument()
  })

  it('needs two characters before it opens', async () => {
    signInAs('averyp')
    await renderApp('/orders')
    await userEvent.type(await box(), 'b')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})
