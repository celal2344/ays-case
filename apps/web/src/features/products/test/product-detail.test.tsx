import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderApp } from '@/test/render'

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

  it('shows 404 for an id the server does not know', async () => {
    await renderApp('/products/9999')
    expect(await screen.findByText('Page not found')).toBeInTheDocument()
  })

  it('shows 404 for a malformed id', async () => {
    await renderApp('/products/abc')
    expect(await screen.findByText('Page not found')).toBeInTheDocument()
  })
})
