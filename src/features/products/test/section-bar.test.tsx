import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { renderApp } from '@/test/render'

type Entry = { isIntersecting: boolean; target: Element }

describe('product page section bar', () => {
  it('lists the sections with the review count and follows the section in view (scroll-spy)', async () => {
    const watchers: Array<{ callback: (entries: Entry[]) => void; elements: Element[] }> = []
    const original = globalThis.IntersectionObserver
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        private entry = {
          callback: (() => {}) as (entries: Entry[]) => void,
          elements: [] as Element[],
        }
        constructor(callback: (entries: Entry[]) => void) {
          this.entry.callback = callback
          watchers.push(this.entry)
        }
        observe(element: Element) {
          this.entry.elements.push(element)
        }
        disconnect() {}
        unobserve() {}
      },
    )
    try {
      await renderApp('/products/2')
      await screen.findByRole('heading', { name: 'groceries item 02' })
      const bar = within(screen.getByRole('navigation', { name: 'Product sections' }))
      await bar.findByRole('link', { name: 'Similar products' }) // after the catalog has loaded
      expect(bar.getAllByRole('link').map((a) => a.textContent)).toEqual([
        'Details',
        'Description',
        'Reviews (1)',
        'Similar products',
      ])
      expect(bar.getByRole('link', { name: 'Details' })).toHaveAttribute('aria-current', 'location')

      // the section observer is the one that watches the section elements
      const spy = watchers.findLast((w) => w.elements.some((el) => el.id === 'reviews'))!
      const reviews = spy.elements.find((el) => el.id === 'reviews')!
      act(() => spy.callback([{ isIntersecting: true, target: reviews }]))
      expect(bar.getByRole('link', { name: 'Reviews (1)' })).toHaveAttribute(
        'aria-current',
        'location',
      )
      expect(bar.getByRole('link', { name: 'Details' })).not.toHaveAttribute('aria-current')
    } finally {
      vi.stubGlobal('IntersectionObserver', original)
    }
  })

  it('clicking a section moves the highlight, sets the URL hash and focuses its heading', async () => {
    const { router } = await renderApp('/products/2')
    await screen.findByRole('heading', { name: 'groceries item 02' })
    await userEvent.click(
      within(screen.getByRole('navigation', { name: 'Product sections' })).getByRole('link', {
        name: /Reviews/,
      }),
    )
    expect(router.state.location.hash).toBe('reviews')
    expect(screen.getByRole('heading', { level: 2, name: /Reviews/ })).toHaveFocus()
    expect(
      within(screen.getByRole('navigation', { name: 'Product sections' })).getByRole('link', {
        name: /Reviews/,
      }),
    ).toHaveAttribute('aria-current', 'location')
  })

  it('clicking the rating jumps to the reviews', async () => {
    const { router } = await renderApp('/products/2')
    await userEvent.click(await screen.findByRole('button', { name: /1 review|\(1\)|1 reviews/i }))
    expect(router.state.location.hash).toBe('reviews')
  })
})
