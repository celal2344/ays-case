import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { describe, expect, it, onTestFinished, vi } from 'vitest'

import { signInAs } from '@/test/auth'
import { fixtureDetail } from '@/test/fixtures/products'
import { server } from '@/test/msw/server'
import { renderApp } from '@/test/render'

const addButtons = () => screen.getAllByRole('button', { name: 'Add to cart' })

describe('product page (PDP-1..6)', () => {
  it('PDP-1: breadcrumb links to the list and to the category-filtered list', async () => {
    const { router } = await renderApp('/products/2')
    const crumbs = within(await screen.findByRole('navigation', { name: 'breadcrumb' }))
    expect(crumbs.getByRole('link', { name: 'Products' })).toHaveAttribute('href', '/products')
    const category = crumbs.getByRole('link', { name: 'Groceries' })
    expect(category).toHaveAttribute('href', '/products?category=groceries')
    expect(crumbs.getByText('groceries item 02')).toBeInTheDocument()
    await userEvent.click(category)
    expect(router.state.location.pathname).toBe('/products')
    expect(router.state.location.search).toEqual({ category: 'groceries' })
  })

  it('PDP-2: thumbnails swap the main image and the main image opens a zoom dialog', async () => {
    // jsdom matches no media query, which is the phone layout; this test is about the desktop one
    const originalMatchMedia = window.matchMedia
    window.matchMedia = (query: string) =>
      ({
        matches: query.includes('min-width'),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList
    onTestFinished(() => {
      window.matchMedia = originalMatchMedia
    })
    server.use(
      http.get('http://localhost/api/products/2', () =>
        HttpResponse.json({
          data: {
            ...fixtureDetail(2),
            images: ['a', 'b', 'c'].map((name, position) => ({
              url: `https://img.test/${name}.webp`,
              position,
              isPrimary: position === 0,
            })),
          },
        }),
      ),
    )
    await renderApp('/products/2')
    const main = await screen.findByRole('img', { name: 'groceries item 02' })
    expect(main).toHaveAttribute('src', 'https://img.test/a.webp')

    await userEvent.click(screen.getByRole('button', { name: 'Show image 3' }))
    expect(screen.getByRole('img', { name: 'groceries item 02' })).toHaveAttribute(
      'src',
      'https://img.test/c.webp',
    )
    expect(screen.getByRole('button', { name: 'Show image 3' })).toHaveAttribute(
      'aria-current',
      'true',
    )

    await userEvent.click(screen.getByRole('button', { name: 'Zoom image' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('img', { name: 'groceries item 02 (3/3)' })).toHaveAttribute(
      'src',
      'https://img.test/c.webp',
    )
  })

  it('PDP-3: shows sale price, struck original price, discount badge and low stock', async () => {
    await renderApp('/products/6') // price 60, 10% off, stock 4
    expect(await screen.findByText('$54.00')).toBeInTheDocument()
    const original = screen.getByText('$60.00')
    expect(original).toHaveClass('line-through')
    expect(screen.getAllByText('-10%').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Only 4 left').length).toBeGreaterThan(0)
  })

  it('PDP-3: out-of-stock disables both buttons', async () => {
    await renderApp('/products/3')
    await screen.findByRole('heading', { name: 'smartphones item 03' })
    expect(screen.getByRole('button', { name: 'Buy now' })).toBeDisabled()
    expect(addButtons()[0]).toBeDisabled()
  })

  it('PDP-4: the quantity is clamped to stock and Add to cart uses it', async () => {
    signInAs('averyp')
    await renderApp('/products/6') // stock 4
    const quantity = await screen.findByRole('textbox', { name: 'Quantity' })
    await userEvent.clear(quantity)
    await userEvent.type(quantity, '99')
    expect(quantity).toHaveValue('4')
    expect(screen.getByRole('button', { name: 'Increase quantity' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Decrease quantity' }))
    expect(quantity).toHaveValue('3')

    await userEvent.click(addButtons()[0]!)
    expect(await screen.findByText(/was added to your cart/)).toBeInTheDocument()
  })

  it('PDP-5: similar products are from the same category and exclude the current product', async () => {
    await renderApp('/products/2')
    const section = (await screen.findByRole('heading', { name: 'Similar products' })).closest(
      'section',
    )!
    const titles = within(section)
      .getAllByRole('link')
      .map((a) => a.textContent)
      .filter(Boolean)
    expect(titles).toContain('groceries item 05')
    expect(titles).not.toContain('groceries item 02')
    expect(titles.every((t) => t?.startsWith('groceries'))).toBe(true)
  })

  it('PDP-6: the sticky bar appears once the main buttons leave the viewport', async () => {
    let notify: (visible: boolean) => void = () => undefined
    const original = globalThis.IntersectionObserver
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        private callback: (entries: { isIntersecting: boolean }[]) => void
        constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
          this.callback = callback
        }
        // only the observer watching the Buy now / Add to cart buttons drives the sticky bar
        observe(element: Element) {
          if (element.textContent?.includes('Buy now')) {
            notify = (visible) => this.callback([{ isIntersecting: visible }])
          }
        }
        disconnect() {}
        unobserve() {}
      },
    )
    await renderApp('/products/2')
    await screen.findByRole('heading', { name: 'groceries item 02' })
    expect(screen.queryByRole('region', { name: 'Quick add to cart' })).not.toBeInTheDocument()

    act(() => notify(false))
    const bar = await screen.findByRole('region', { name: 'Quick add to cart' })
    expect(within(bar).getByRole('button', { name: 'Add to cart' })).toBeEnabled()

    act(() => notify(true))
    expect(screen.queryByRole('region', { name: 'Quick add to cart' })).not.toBeInTheDocument()
    vi.stubGlobal('IntersectionObserver', original)
  })

  it('shows the specs from the API, converting grams and millimetres for display', async () => {
    await renderApp('/products/2')
    await screen.findByRole('heading', { name: 'groceries item 02' })
    const specs = screen.getByRole('region', { name: 'Details' })
    expect(within(specs).getByText('Brand')).toBeInTheDocument()
    expect(within(specs).getByText('1 week warranty')).toBeInTheDocument()
    expect(within(specs).getByText('15 × 13 × 23 cm')).toBeInTheDocument()
    expect(within(specs).getByText('4 kg')).toBeInTheDocument()
  })

  it('shows "no reviews yet" for a product nobody has reviewed, instead of a rating', async () => {
    await renderApp('/products/7')
    await screen.findByRole('heading', { name: 'beauty item 07' })
    expect(screen.getAllByText('No reviews yet').length).toBeGreaterThan(0)
  })
})
