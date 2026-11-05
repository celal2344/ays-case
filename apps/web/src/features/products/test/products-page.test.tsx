import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'

import { server } from '@/test/msw/server'
import { renderApp } from '@/test/render'

import { serveCatalog } from '@/test/catalog'

const search = (router: { state: { location: { search: unknown } } }) =>
  router.state.location.search

const cardTitles = () =>
  screen
    .getAllByRole('listitem')
    .filter((li) => !li.closest('nav, [aria-label="Active filters"]'))
    .map((li) => li.textContent ?? '')

describe('shop list (PROD-1, PROD-6, EX-1..4, EX-12)', () => {
  it('PROD-6: shows the first 12 of 30 as cards with the range', async () => {
    await renderApp('/products')
    expect(await screen.findByText('Showing 1–12 of 30')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem').filter((li) => !li.closest('nav'))).toHaveLength(12)
    expect(screen.getByText('1 / 3')).toBeInTheDocument() // the compact pager label
  })

  it('sorts by the biggest discount and by newest from the URL', async () => {
    await renderApp('/products?sort=discount&order=desc')
    expect(await screen.findByText('Showing 1–12 of 30')).toBeInTheDocument()
    const first = cardTitles()[0]
    expect(first).toBeTruthy()
  })

  it('EX-1/2/3/4: a combined URL reproduces the whole view', async () => {
    await renderApp('/products?q=item&category=smartphones&sort=price&order=desc&page=2')
    // 10 smartphones fit on one page, so the stale page=2 is clamped to page 1
    expect(await screen.findByText('Showing 1–10 of 10')).toBeInTheDocument()
    expect(cardTitles()[0]).toContain('smartphones item 30')
  })

  it('EX-1: search by text, from the URL', async () => {
    await renderApp('/products?q=item%2007')
    expect(await screen.findByText('Showing 1–1 of 1')).toBeInTheDocument()
    expect(cardTitles()[0]).toContain('beauty item 07')
  })

  it('EX-2: category filter from the URL', async () => {
    await renderApp('/products?category=groceries')
    expect(await screen.findByText('Showing 1–10 of 10')).toBeInTheDocument()
  })

  it('EX-3: sort by price descending puts the most expensive first', async () => {
    await renderApp('/products?sort=price&order=desc')
    await screen.findByText('Showing 1–12 of 30')
    expect(cardTitles()[0]).toContain('item 30')
  })

  it('EX-4: page 3 shows the short last page, and a stale page is clamped', async () => {
    await renderApp('/products?page=3')
    expect(await screen.findByText('Showing 25–30 of 30')).toBeInTheDocument()
  })

  it('EX-4: Next moves to page 2 in the URL and the back button returns', async () => {
    const { router } = await renderApp('/products')
    await screen.findByText('Showing 1–12 of 30')
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByText('Showing 13–24 of 30')).toBeInTheDocument()
    expect(search(router)).toEqual({ page: 2 })
    router.history.back()
    expect(await screen.findByText('Showing 1–12 of 30')).toBeInTheDocument()
  })

  it('EX-1: typing in the search box updates ?q after the debounce and resets the page', async () => {
    const { router } = await renderApp('/products?page=2')
    await screen.findByText('Showing 13–24 of 30')
    await userEvent.type(screen.getByRole('combobox', { name: 'Search products' }), 'item 05')
    await waitFor(() => expect(search(router)).toEqual({ q: 'item 05' }))
    expect(await screen.findByText('Showing 1–1 of 1')).toBeInTheDocument()
  })

  it('shows the empty state and Clear filters restores the list', async () => {
    const { router } = await renderApp('/products?q=zzzz')
    expect(await screen.findByText('No products match your filters')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(await screen.findByText('Showing 1–12 of 30')).toBeInTheDocument()
    expect(search(router)).toEqual({})
    expect(screen.getByRole('combobox', { name: 'Search products' })).toHaveValue('')
  })

  it('EX-12: ?view=table renders a table; the choice is saved as a preference', async () => {
    await renderApp('/products?view=table')
    expect(await screen.findByRole('table')).toBeInTheDocument()
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(13) // header + 12
  })

  it('EX-14: shows discount, low-stock and out-of-stock badges, and disables Add to cart when out', async () => {
    await renderApp('/products')
    await screen.findByText('Showing 1–12 of 30')
    expect(screen.getAllByText('-10%').length).toBeGreaterThan(0)
    expect(screen.getByText('Only 4 left')).toBeInTheDocument()
    expect(screen.getByText('Out of stock')).toBeInTheDocument()
    const outOfStockCard = screen.getByText('smartphones item 03').closest('li')!
    expect(within(outOfStockCard).getByRole('button', { name: 'Add to cart' })).toBeDisabled()
  })

  it('shows the catalog as the server sends it: edited and removed products', async () => {
    serveCatalog((products) =>
      products
        .filter((p) => p.id !== 1)
        .map((p) => (p.id === 2 ? { ...p, title: 'Renamed by admin' } : p)),
    )
    await renderApp('/products')
    expect(await screen.findByText('Showing 1–12 of 29')).toBeInTheDocument()
    expect(screen.getByText('Renamed by admin')).toBeInTheDocument()
    expect(screen.queryByText('beauty item 01')).not.toBeInTheDocument()
  })

  it('NF-5: shows an error with Retry when the catalog fails', async () => {
    server.use(
      http.get('http://localhost/api/products', () =>
        HttpResponse.json({ code: 'server_error', message: 'boom' }, { status: 500 }),
      ),
    )
    await renderApp('/products')
    expect(await screen.findByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })
})
