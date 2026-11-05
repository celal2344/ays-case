import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { signInAs } from '@/test/auth'
import { admin } from '@/test/msw/handlers'
import { renderApp } from '@/test/render'

const openTags = async () => {
  signInAs('emilys')
  const view = await renderApp('/admin/products?edit=1&section=tags')
  const search = await screen.findByLabelText('Search tags')
  return { ...view, search }
}

const chips = () => document.querySelectorAll('[data-slot="combobox-chip"]')

describe('tag picker', () => {
  it('filters the list as you type and selects with the keyboard', async () => {
    const { search } = await openTags()
    const before = chips().length
    const tag = admin.lookups.tags.find(
      (t) => !admin.liveProduct(1)!.tags.some((x) => x.slug === t.slug),
    )!
    await userEvent.type(search, (tag.name ?? '').slice(0, 3))
    const options = await screen.findAllByRole('option')
    expect(options.length).toBeLessThan(admin.lookups.tags.length)
    expect(options.some((o) => o.textContent === tag.name)).toBe(true)

    await userEvent.type(search, '{ArrowDown}')
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(chips().length).toBe(before + 1))
  })

  it('Backspace removes the last chip', async () => {
    const { search } = await openTags()
    const before = chips().length
    expect(before).toBeGreaterThan(0)
    await userEvent.click(search)
    await userEvent.keyboard('{Backspace}')
    await waitFor(() => expect(chips().length).toBe(before - 1))
  })

  it('shows the most used tags as one-click chips while the search is empty', async () => {
    const { search } = await openTags()
    const group = screen.getByText('Most used').parentElement!
    const buttons = within(group).getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
    expect(buttons.length).toBeLessThanOrEqual(8)
    const before = chips().length
    await userEvent.click(buttons[0]!)
    await waitFor(() => expect(chips().length).toBe(before + 1))
    await userEvent.type(search, 'zz')
    expect(screen.queryByText('Most used')).not.toBeInTheDocument()
  })
})
