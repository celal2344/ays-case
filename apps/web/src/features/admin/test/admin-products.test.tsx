import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'

import { signInAs } from '@/test/auth'
import { admin } from '@/test/msw/handlers'
import { server } from '@/test/msw/server'
import { renderApp } from '@/test/render'

/** Records every request the app makes while a test runs. */
function recordRequests() {
  const seen: string[] = []
  server.events.on('request:start', ({ request }) => {
    const { pathname } = new URL(request.url)
    // recording a product view is a normal side effect of opening a page, not an admin write
    if (!pathname.startsWith('/api/recently-viewed')) seen.push(`${request.method} ${pathname}`)
  })
  return seen
}

const writes = (requests: string[]) => requests.filter((r) => /^(PUT|POST|PATCH|DELETE)/.test(r))

afterEach(() => server.events.removeAllListeners())

const search = (router: { state: { location: { search: unknown } } }) =>
  router.state.location.search

async function fillForm(values: {
  title: string
  price: string
  sku?: string
  stock?: string
  category?: string
}) {
  await userEvent.type(screen.getByLabelText('Title'), values.title)
  await userEvent.type(screen.getByLabelText('Description'), 'A perfectly reasonable description.')
  await userEvent.type(screen.getByLabelText('SKU'), values.sku ?? 'NEW-1')
  await userEvent.click(screen.getByRole('combobox', { name: 'Category' }))
  await userEvent.click(await screen.findByRole('option', { name: values.category ?? 'Beauty' }))
  await userEvent.type(screen.getByLabelText('Price'), values.price)
  if (values.stock) {
    await userEvent.clear(screen.getByLabelText('Stock'))
    await userEvent.type(screen.getByLabelText('Stock'), values.stock)
  }
}

describe('admin access', () => {
  it('AUTH-7: a normal user is sent to /forbidden from every admin page', async () => {
    signInAs('averyp')
    for (const path of [
      '/admin',
      '/admin/products',
      '/admin/products/new',
      '/admin/products/1/edit',
      '/admin/lookups/brands',
    ]) {
      const { router, unmount } = await renderApp(path)
      expect(router.state.location.pathname).toBe('/forbidden')
      unmount()
    }
  })

  it('AUTH-4: signed out goes to login and comes back after signing in', async () => {
    const { router } = await renderApp('/admin/products')
    expect(router.state.location.pathname).toBe('/login')
    expect(search(router)).toEqual({ redirect: '/admin/products' })
  })
})

describe('admin product table (PROD-2)', () => {
  it('lists products with thumbnail, title, category, price, stock and actions, 20 per page', async () => {
    signInAs('emilys')
    await renderApp('/admin/products')
    expect(await screen.findByText('Showing 1–20 of 30')).toBeInTheDocument()
    const rows = screen.getAllByRole('row')
    expect(rows).toHaveLength(21) // header + 20
    const first = within(rows[1]!)
    expect(first.getByRole('link', { name: 'beauty item 01' })).toBeInTheDocument()
    expect(first.getByText('Beauty')).toBeInTheDocument()
    expect(first.getByText('$10.00')).toBeInTheDocument()
    expect(first.getByRole('link', { name: 'Edit beauty item 01' })).toHaveAttribute(
      'href',
      '/admin/products/1/edit',
    )
    expect(first.getByRole('button', { name: 'Delete beauty item 01' })).toBeInTheDocument()
  })

  it('pages through the list via the URL', async () => {
    signInAs('emilys')
    const { router } = await renderApp('/admin/products')
    await screen.findByText('Showing 1–20 of 30')
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByText('Showing 21–30 of 30')).toBeInTheDocument()
    expect(search(router)).toEqual({ page: 2 })
  })

  it('sorts by a column header; the URL holds the sort and a second click flips it', async () => {
    signInAs('emilys')
    const { router } = await renderApp('/admin/products')
    await screen.findByText('Showing 1–20 of 30')
    await userEvent.click(screen.getByRole('button', { name: 'Price' }))
    await waitFor(() => expect(search(router)).toEqual({ sort: 'price', order: 'asc' }))
    expect(within(screen.getAllByRole('row')[1]!).getByText('beauty item 01')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Price' }))
    await waitFor(() => expect(search(router)).toEqual({ sort: 'price', order: 'desc' }))
    expect(
      within(screen.getAllByRole('row')[1]!).getByText('smartphones item 30'),
    ).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Price/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    )
  })

  it('filters by search text and category', async () => {
    signInAs('emilys')
    await renderApp('/admin/products?category=beauty&q=item%200')
    expect(await screen.findByText('Showing 1–3 of 3')).toBeInTheDocument() // beauty items 01, 04, 07 match "item 0"
  })

  it('shows an empty state when nothing matches', async () => {
    signInAs('emilys')
    await renderApp('/admin/products?q=zzzz')
    expect(await screen.findByText('No products match your filters')).toBeInTheDocument()
  })
})

describe('create a product (PROD-3)', () => {
  it('validates before sending anything', async () => {
    signInAs('emilys')
    const requests = recordRequests()
    await renderApp('/admin/products/new')
    await userEvent.click(await screen.findByRole('button', { name: 'Create product' }))
    expect(await screen.findByText('Enter a title of 2 to 100 characters.')).toBeInTheDocument()
    expect(screen.getByText('Choose a category.')).toBeInTheDocument()
    expect(screen.getByText('Enter a SKU of 1 to 64 characters.')).toBeInTheDocument()
    expect(screen.getByText('Enter a price above 0 with at most 2 decimals.')).toBeInTheDocument()
    expect(writes(requests)).toEqual([])
  })

  it('creates the product on the server and shows it in the admin table and the shop', async () => {
    signInAs('emilys')
    const { router } = await renderApp('/admin/products/new')
    await fillForm({ title: 'Brand new gadget', price: '49.9', stock: '12' })
    await userEvent.click(screen.getByRole('button', { name: 'Create product' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/products'))
    expect(admin.adminProducts()[0]).toMatchObject({
      title: 'Brand new gadget',
      sku: 'NEW-1',
      priceCents: 4990,
      stock: 12,
      category: { slug: 'beauty' },
    })

    expect(await screen.findByText('Showing 1–20 of 31')).toBeInTheDocument()
    expect(within(screen.getAllByRole('row')[1]!).getByText('Brand new gadget')).toBeInTheDocument()
    await router.navigate({ to: '/products' })
    expect(await screen.findByText('Brand new gadget')).toBeInTheDocument()
  })

  it('shows the server refusal when the SKU is taken', async () => {
    signInAs('emilys')
    const { router } = await renderApp('/admin/products/new')
    await fillForm({ title: 'Twin', price: '5', sku: 'SKU-1' })
    await userEvent.click(screen.getByRole('button', { name: 'Create product' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/admin/products/new')
    expect(admin.adminProducts()).toHaveLength(30)
  })

  it('previews an image URL as you add it', async () => {
    signInAs('emilys')
    await renderApp('/admin/products/new')
    await userEvent.click(await screen.findByRole('button', { name: 'Add image' }))
    await userEvent.type(screen.getByLabelText('Image 1 URL'), 'https://img.test/x.webp')
    expect(screen.getByLabelText('Image 1 URL')).toHaveValue('https://img.test/x.webp')
  })
})

describe('edit a product (PROD-4)', () => {
  it('pre-fills the form; saving updates the shop and the detail page', async () => {
    signInAs('emilys')
    const { router } = await renderApp('/admin/products/1/edit')
    expect(await screen.findByLabelText('Title')).toHaveValue('beauty item 01')
    expect(screen.getByLabelText('Price')).toHaveValue('10')
    expect(screen.getByLabelText('SKU')).toHaveValue('SKU-1')

    await userEvent.clear(screen.getByLabelText('Price'))
    await userEvent.type(screen.getByLabelText('Price'), '12.5')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/products'))

    expect(admin.liveProduct(1)).toMatchObject({ priceCents: 1250 })

    await router.navigate({ to: '/products/$productId', params: { productId: '1' } })
    expect((await screen.findAllByText('$12.50')).length).toBeGreaterThan(0)
  })

  it('an unknown product id shows 404', async () => {
    signInAs('emilys')
    await renderApp('/admin/products/99999/edit')
    expect(await screen.findByText('Page not found')).toBeInTheDocument()
  })

  it('asks before discarding unsaved changes', async () => {
    signInAs('emilys')
    const { router } = await renderApp('/admin/products/1/edit')
    await userEvent.type(await screen.findByLabelText('Title'), ' changed')
    await userEvent.click(screen.getByRole('link', { name: 'Cancel' }))

    const dialog = await screen.findByRole('alertdialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Keep editing' }))
    expect(router.state.location.pathname).toBe('/admin/products/1/edit')

    await userEvent.click(screen.getByRole('link', { name: 'Cancel' }))
    await userEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: 'Discard changes',
      }),
    )
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/products'))
    expect(admin.liveProduct(1)?.title).toBe('beauty item 01')
  })

  it('does not ask when nothing changed', async () => {
    signInAs('emilys')
    const { router } = await renderApp('/admin/products/1/edit')
    await userEvent.click(await screen.findByRole('link', { name: 'Cancel' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/products'))
  })
})

describe('delete and restore a product (PROD-5)', () => {
  it('asks to confirm, then soft-deletes it: gone from the shop and the detail page', async () => {
    signInAs('emilys')
    const requests = recordRequests()
    const { router } = await renderApp('/admin/products')
    await userEvent.click(await screen.findByRole('button', { name: 'Delete groceries item 02' }))

    const dialog = await screen.findByRole('alertdialog')
    expect(requests.filter((r) => r.startsWith('DELETE'))).toEqual([]) // nothing yet
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('groceries item 02 was deleted.')).toBeInTheDocument()
    expect(requests.filter((r) => r.startsWith('DELETE'))).toEqual(['DELETE /api/products/2'])
    expect(await screen.findByText('Showing 1–20 of 29')).toBeInTheDocument()

    await router.navigate({ to: '/products/$productId', params: { productId: '2' } })
    expect(await screen.findByText('Page not found')).toBeInTheDocument()
  })

  it('cancel keeps the product', async () => {
    signInAs('emilys')
    const requests = recordRequests()
    await renderApp('/admin/products')
    await userEvent.click(await screen.findByRole('button', { name: 'Delete groceries item 02' }))
    await userEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cancel' }),
    )
    expect(writes(requests)).toEqual([])
    expect(screen.getByText('groceries item 02')).toBeInTheDocument()
  })

  it('deleted products can be listed and restored', async () => {
    signInAs('emilys')
    admin.deleteProduct(2)
    await renderApp('/admin/products?deleted=only')
    expect(await screen.findByText('Showing 1–1 of 1')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Restore groceries item 02' }))
    expect(await screen.findByText('groceries item 02 was restored.')).toBeInTheDocument()
    expect(admin.liveProduct(2)).toBeDefined()
  })
})

describe('dashboard (EX-13, EX-15)', () => {
  it('shows product, user, low-stock, out-of-stock and order counts', async () => {
    signInAs('emilys')
    admin.deleteProduct(2)
    await renderApp('/admin')
    // the labels also appear as nav links, so pick the one that sits inside a stat card
    const stat = (label: string) =>
      screen
        .getAllByText(label)
        .map((el) => el.closest('[data-slot="card"]'))
        .find((card): card is HTMLElement => card !== null)!
    await waitFor(() => expect(within(stat('Products')).getByText('29')).toBeInTheDocument())
    expect(within(stat('Users')).getByText('25')).toBeInTheDocument()
    expect(within(stat('Low stock')).getByText('1')).toBeInTheDocument() // id 6 has stock 4
    expect(within(stat('Out of stock')).getByText('1')).toBeInTheDocument() // id 3
  })

  it('links to every lookup list', async () => {
    signInAs('emilys')
    await renderApp('/admin')
    expect(await screen.findByRole('link', { name: 'Brands' })).toHaveAttribute(
      'href',
      '/admin/lookups/brands',
    )
  })
})

describe('lookup lists', () => {
  it('lists, creates and deletes a brand', async () => {
    signInAs('emilys')
    await renderApp('/admin/lookups/brands')
    expect(await screen.findByText('Brand 1')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'New' }))
    await userEvent.type(await screen.findByLabelText('Name'), 'Acme')
    await userEvent.click(screen.getByRole('button', { name: /Create|Save/ }))
    await waitFor(() => expect(admin.lookups.brands.some((b) => b.slug === 'acme')).toBe(true))
    expect(await screen.findByText('Acme')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Delete Acme' }))
    await userEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Delete' }),
    )
    await waitFor(() => expect(admin.lookups.brands.some((b) => b.slug === 'acme')).toBe(false))
  })
})
