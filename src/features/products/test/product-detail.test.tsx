import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { productInput } from '@/test/fixtures/products'
import { renderApp } from '@/test/render'

import { useProductOverlayStore } from '../overlay-store'

describe('product detail page states', () => {
  it('shows the product with price, discount and description', async () => {
    await renderApp('/products/2')
    expect(await screen.findByRole('heading', { name: 'groceries item 02' })).toBeInTheDocument()
    expect(await screen.findByText('Description of groceries item 2')).toBeInTheDocument()
    expect(screen.getAllByText('-10%').length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Add to cart' })[0]).toBeEnabled()
  })

  it('disables Add to cart for an out-of-stock product', async () => {
    await renderApp('/products/3')
    expect((await screen.findAllByText('Out of stock')).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Add to cart' })[0]).toBeDisabled()
  })

  it('applies the admin patch on top of the remote product', async () => {
    useProductOverlayStore.getState().update(2, { title: 'Patched title' })
    await renderApp('/products/2')
    expect(await screen.findByRole('heading', { name: 'Patched title' })).toBeInTheDocument()
  })

  it('shows 404 for a deleted product, an unknown id and a malformed id', async () => {
    useProductOverlayStore.getState().remove(5)
    await renderApp('/products/5')
    expect(await screen.findByText('Page not found')).toBeInTheDocument()
  })

  it('shows 404 for an id DummyJSON does not know', async () => {
    await renderApp('/products/9999')
    expect(await screen.findByText('Page not found')).toBeInTheDocument()
  })

  it('shows 404 for a malformed id', async () => {
    await renderApp('/products/abc')
    expect(await screen.findByText('Page not found')).toBeInTheDocument()
  })

  it('serves a locally created product from the overlay without any request', async () => {
    const local = useProductOverlayStore.getState().create(productInput({ title: 'Local gadget' }))
    await renderApp(`/products/${local.id}`)
    expect(await screen.findByRole('heading', { name: 'Local gadget' })).toBeInTheDocument()
  })
})
