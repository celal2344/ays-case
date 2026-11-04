import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { signInAs } from '@/test/auth'
import { admin } from '@/test/msw/handlers'
import { renderApp } from '@/test/render'

describe('admin layout', () => {
  it('keeps the same sidebar in place while moving between admin pages', async () => {
    signInAs('emilys')
    const { router } = await renderApp('/admin')
    const sidebar = await screen.findByTestId('admin-sidebar')
    expect(within(sidebar).getByRole('link', { name: /Dashboard/ })).toHaveAttribute(
      'aria-current',
      'page',
    )

    for (const [to, name] of [
      ['/admin/products', /Products/],
      ['/admin/users', /Users/],
      ['/admin/lookups/tags', /Tags/],
    ] as const) {
      await userEvent.click(within(sidebar).getByRole('link', { name }))
      await waitFor(() => expect(router.state.location.pathname).toBe(to))
      expect(screen.getByTestId('admin-sidebar')).toBe(sidebar) // the same element, not a new one
      expect(sidebar.isConnected).toBe(true)
      expect(within(sidebar).getByRole('link', { name })).toHaveAttribute('aria-current', 'page')
    }
  })

  it('groups the pages and collapses to icons', async () => {
    signInAs('emilys')
    await renderApp('/admin')
    const sidebar = await screen.findByTestId('admin-sidebar')
    for (const group of ['General', 'Catalog', 'Policies']) {
      expect(within(sidebar).getByText(group)).toBeInTheDocument()
    }
    for (const page of ['Brands', 'Categories', 'Warranty', 'Shipping', 'Returns']) {
      expect(within(sidebar).getByRole('link', { name: page })).toBeInTheDocument()
    }
    await userEvent.click(within(sidebar).getByRole('button', { name: 'Collapse menu' }))
    expect(within(sidebar).queryByText('Catalog')).not.toBeInTheDocument()
    expect(within(sidebar).getByRole('button', { name: 'Expand menu' })).toBeInTheDocument()
  })

  it('the dashboard stat cards link to their pages', async () => {
    signInAs('emilys')
    await renderApp('/admin')
    expect(await screen.findByRole('link', { name: /^Products: \d+$/ })).toHaveAttribute(
      'href',
      '/admin/products',
    )
    expect(screen.getByRole('link', { name: /^Users: \d+$/ })).toHaveAttribute(
      'href',
      '/admin/users',
    )
    expect(screen.getByRole('link', { name: /^Orders: \d+$/ })).toHaveAttribute('href', '/orders')
  })
})

describe('lookup dialogs', () => {
  it('open from the New button and the pencil, and from the URL', async () => {
    signInAs('emilys')
    const first = await renderApp('/admin/lookups/brands')
    await userEvent.click(await screen.findByRole('button', { name: 'New' }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(first.router.state.location.search).toEqual({ new: 1 })
    first.unmount()

    const brand = admin.lookups.brands[0]!
    const second = await renderApp(`/admin/lookups/brands?edit=${brand.id}`)
    expect(await screen.findByLabelText('Name')).toHaveValue(brand.name)
    expect(second.router.state.location.search).toEqual({ edit: brand.id })
  })

  it('asks before discarding typed changes', async () => {
    signInAs('emilys')
    const { router } = await renderApp('/admin/lookups/brands?new=1')
    await userEvent.type(await screen.findByLabelText('Name'), 'Zed')
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await userEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: 'Discard changes',
      }),
    )
    await waitFor(() => expect(router.state.location.search).toEqual({}))
  })
})
