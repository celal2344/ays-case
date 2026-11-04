import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { signInAs } from '@/test/auth'
import { fixtureProducts } from '@/test/fixtures/products'
import { renderApp } from '@/test/render'

import { brandsOf, filterByBrand, filterByMinRating, filterByPrice } from '../catalog'
import { salePriceCents } from '@ays/validators'
import { qualifiesForFreeShipping } from '../pricing'
import { productSearchSchema } from '../schemas'
import { activeFilters, normalizeSearch, withoutFilter } from '../search-state'

const search = (router: { state: { location: { search: unknown } } }) =>
  router.state.location.search
const sale = (p: (typeof fixtureProducts)[number]) => salePriceCents(p) / 100

describe('filter helpers', () => {
  it('filters by sale price, inclusive, with either bound optional', () => {
    const result = filterByPrice(fixtureProducts, 100, 150)
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((p) => sale(p) >= 100 && sale(p) <= 150)).toBe(true)
    expect(filterByPrice(fixtureProducts, undefined, undefined)).toBe(fixtureProducts)
    expect(filterByPrice(fixtureProducts, 250, undefined).every((p) => sale(p) >= 250)).toBe(true)
    expect(filterByPrice(fixtureProducts, undefined, 20).every((p) => sale(p) <= 20)).toBe(true)
  })

  it('filters by brand and by minimum rating, and lists distinct brands', () => {
    expect(filterByBrand(fixtureProducts, 'Brand 1').every((p) => p.brand === 'Brand 1')).toBe(true)
    expect(filterByBrand(fixtureProducts, undefined)).toBe(fixtureProducts)
    expect(filterByMinRating(fixtureProducts, 4).every((p) => p.rating >= 4)).toBe(true)
    expect(brandsOf(fixtureProducts)).toEqual(['Brand 0', 'Brand 1', 'Brand 2'])
  })

  it('knows which products ship free (sale price from $50)', () => {
    expect(qualifiesForFreeShipping({ price: 50, discountPercentage: 0 })).toBe(true)
    expect(qualifiesForFreeShipping({ price: 50, discountPercentage: 10 })).toBe(false)
  })
})

describe('filter URL state', () => {
  it('parses and normalizes the new params, ignoring junk', () => {
    expect(
      productSearchSchema.parse({ minPrice: '10', maxPrice: '99.5', brand: 'Acme', rating: '3' }),
    ).toEqual({ minPrice: 10, maxPrice: 99.5, brand: 'Acme', rating: 3 })
    expect(productSearchSchema.parse({ minPrice: '-1', rating: '9', maxPrice: 'abc' })).toEqual({})
    expect(normalizeSearch({ brand: '' }).brand).toBeUndefined()
  })

  it('lists active filters and builds the search that removes them', () => {
    const search = { q: 'x', category: 'beauty', minPrice: 5, brand: 'A', rating: 2 }
    expect(activeFilters(search)).toEqual(['q', 'category', 'price', 'brand', 'rating'])
    expect(activeFilters({ sort: 'price' as const, page: 2 })).toEqual([])
    expect(withoutFilter('price')).toEqual({ minPrice: undefined, maxPrice: undefined })
    expect(Object.keys(withoutFilter())).toHaveLength(7)
  })
})

describe('filters on the shop list', () => {
  it('applies price, brand and rating from the URL together', async () => {
    await renderApp('/products?minPrice=100&brand=Brand%201&rating=3')
    const expected = fixtureProducts.filter(
      (p) => sale(p) >= 100 && p.brand === 'Brand 1' && p.rating >= 3,
    )
    expect(expected.length).toBeGreaterThan(0)
    expect(
      await screen.findByText(`${expected.length} result${expected.length === 1 ? '' : 's'}`),
    ).toBeInTheDocument()
  })

  it('shows one removable chip per filter and Clear all', async () => {
    const { router } = await renderApp('/products?brand=Brand%201&rating=3&category=beauty')
    const chips = await screen.findByRole('list', { name: 'Active filters' })
    expect(within(chips).getByText('Brand: Brand 1')).toBeInTheDocument()
    expect(within(chips).getByText('Rating: 3+ stars')).toBeInTheDocument()
    expect(within(chips).getByText('Category: Beauty')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Remove filter: Brand: Brand 1' }))
    await waitFor(() => expect(search(router)).toEqual({ rating: 3, category: 'beauty' }))

    await userEvent.click(screen.getByRole('button', { name: 'Clear all' }))
    await waitFor(() => expect(search(router)).toEqual({}))
    expect(screen.queryByRole('list', { name: 'Active filters' })).not.toBeInTheDocument()
  })

  it('the side panel changes category, brand and rating in the URL and resets the page', async () => {
    const { router } = await renderApp('/products?page=2')
    await screen.findByText('Showing 13–24 of 30')
    const panel = screen.getByRole('complementary', { name: 'Filters' })

    await userEvent.click(within(panel).getByRole('radio', { name: 'Smartphones' }))
    await waitFor(() => expect(search(router)).toEqual({ category: 'smartphones' }))

    await userEvent.click(within(panel).getByRole('radio', { name: 'Brand 0' }))
    await waitFor(() =>
      expect(search(router)).toEqual({ category: 'smartphones', brand: 'Brand 0' }),
    )

    await userEvent.click(within(panel).getByRole('radio', { name: /^3 stars & up/ }))
    await waitFor(() =>
      expect(search(router)).toEqual({ category: 'smartphones', brand: 'Brand 0', rating: 3 }),
    )
  })

  it('the price range applies on submit, swaps reversed bounds and follows the URL', async () => {
    const { router } = await renderApp('/products')
    await screen.findByText('Showing 1–12 of 30')
    const panel = screen.getByRole('complementary', { name: 'Filters' })

    await userEvent.type(within(panel).getByRole('spinbutton', { name: 'Minimum price' }), '200')
    await userEvent.type(within(panel).getByRole('spinbutton', { name: 'Maximum price' }), '50')
    await userEvent.click(within(panel).getByRole('button', { name: 'Apply' }))
    await waitFor(() => expect(search(router)).toEqual({ minPrice: 50, maxPrice: 200 }))

    await userEvent.click(screen.getByRole('button', { name: /Remove filter: Price/ }))
    await waitFor(() => expect(search(router)).toEqual({}))
    expect(within(panel).getByRole('spinbutton', { name: 'Minimum price' })).toHaveValue(null)
  })

  it('shows the Free shipping tag only on products at or above $50', async () => {
    await renderApp('/products?sort=price&order=desc')
    await screen.findByText('Showing 1–12 of 30')
    const expensive = screen.getByText('smartphones item 30').closest('li')!
    expect(within(expensive).getByText('Free shipping')).toBeInTheDocument()
  })
})

describe('header search and category strip', () => {
  it('searching from another page waits for Enter, then opens the list with the query', async () => {
    signInAs('averyp')
    const { router } = await renderApp('/orders')
    const box = await screen.findByRole('combobox', { name: 'Search products' })
    await userEvent.type(box, 'item 07')
    expect(router.state.location.pathname).toBe('/orders')
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(router.state.location.pathname).toBe('/products'))
    expect(search(router)).toEqual({ q: 'item 07' })
    expect(await screen.findByText('1 result')).toBeInTheDocument()
  })

  it('on the list, the header search keeps the other filters', async () => {
    const { router } = await renderApp('/products?category=beauty')
    await userEvent.type(
      await screen.findByRole('combobox', { name: 'Search products' }),
      'item 04',
    )
    await waitFor(() => expect(search(router)).toEqual({ category: 'beauty', q: 'item 04' }))
  })
})
