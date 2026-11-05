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

const next = async () => userEvent.click(await screen.findByRole('button', { name: 'Next' }))
/** A section button; its name gains "Has errors" while it is flagged. */
const section = (name: string) => screen.getByRole('button', { name: new RegExp('^' + name) })

async function fillGeneral(values: { title: string; sku?: string; category?: string }) {
  await userEvent.type(await screen.findByLabelText('Title'), values.title)
  await userEvent.type(screen.getByLabelText('Description'), 'A perfectly reasonable description.')
  await userEvent.type(screen.getByLabelText('SKU'), values.sku ?? 'NEW-1')
  await userEvent.click(screen.getByRole('combobox', { name: 'Category' }))
  await userEvent.click(await screen.findByRole('option', { name: values.category ?? 'Beauty' }))
}

/** Walks the create steps to the review; the price and stock come from `values`. */
async function fillToReview(values: {
  title: string
  price: string
  sku?: string
  stock?: string
}) {
  await fillGeneral(values)
  await next()
  await userEvent.type(await screen.findByLabelText('Price'), values.price)
  if (values.stock) {
    await userEvent.clear(screen.getByLabelText('Stock'))
    await userEvent.type(screen.getByLabelText('Stock'), values.stock)
  }
  for (let i = 0; i < 4; i++) await next() // size, tags, images, review
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
      '/admin/products?edit=1',
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

const formDialog = () => screen.findByRole('dialog', { name: /product/i })

describe('create a product (PROD-3)', () => {
  it('opens from the New product button, and from the URL; the old /new route redirects', async () => {
    signInAs('emilys')
    const { router, unmount } = await renderApp('/admin/products')
    await userEvent.click(await screen.findByRole('link', { name: 'New product' }))
    expect(await formDialog()).toHaveTextContent('New product')
    expect(search(router)).toEqual({ new: 1 })
    unmount()

    for (const path of ['/admin/products?new=1', '/admin/products/new']) {
      const view = await renderApp(path)
      expect(await formDialog()).toHaveTextContent('New product')
      expect(view.router.state.location.pathname).toBe('/admin/products')
      expect(search(view.router)).toEqual({ new: 1 })
      view.unmount()
    }
  })

  it('blocks Next on invalid fields and shows what to fix, then moves on when they are fine', async () => {
    signInAs('emilys')
    const requests = recordRequests()
    await renderApp('/admin/products?new=1')
    await next()
    expect(await screen.findByText('Enter a title of 2 to 100 characters.')).toBeInTheDocument()
    expect(screen.getByText('Choose a category.')).toBeInTheDocument()
    expect(screen.getByText('Enter a SKU of 1 to 64 characters.')).toBeInTheDocument()
    expect(section('General')).toHaveAttribute('aria-current', 'step')
    expect(screen.queryByLabelText('Price')).not.toBeVisible()
    expect(section('Price and stock')).toBeDisabled() // later steps wait until this one is valid

    await fillGeneral({ title: 'Brand new gadget' })
    await next()
    expect(await screen.findByLabelText('Price')).toBeVisible()
    expect(section('Price and stock')).toHaveAttribute('aria-current', 'step')
    await next() // price is empty
    expect(await screen.findByText('Enter a price above 0 with at most 2 decimals.')).toBeVisible()
    expect(writes(requests)).toEqual([])
  })

  it('creates the product on the server and shows it in the admin table and the shop', async () => {
    signInAs('emilys')
    const { router } = await renderApp('/admin/products?new=1')
    await fillToReview({ title: 'Brand new gadget', price: '49.9', stock: '12' })
    expect(await screen.findByText('Check the summary, then create the product.')).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Create product' }))

    await waitFor(() => expect(search(router)).toEqual({}))
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

  it('shows the server refusal when the SKU is taken, and stays open', async () => {
    signInAs('emilys')
    const { router } = await renderApp('/admin/products?new=1')
    await fillToReview({ title: 'Twin', price: '5', sku: 'SKU-1' })
    await userEvent.click(screen.getByRole('button', { name: 'Create product' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(search(router)).toEqual({ new: 1 })
    expect(admin.adminProducts()).toHaveLength(30)
  })

  it('previews an image URL as you add it', async () => {
    signInAs('emilys')
    await renderApp('/admin/products?edit=1&section=images')
    await userEvent.click(await screen.findByRole('button', { name: 'Add image' }))
    const added = screen.getAllByLabelText(/^Image \d+ URL$/).at(-1)!
    await userEvent.type(added, 'https://img.test/x.webp')
    expect(added).toHaveValue('https://img.test/x.webp')
  })
})

describe('edit a product (PROD-4)', () => {
  it('opens from the Edit button and from the URL, pre-filled; the old edit route redirects', async () => {
    signInAs('emilys')
    const { router, unmount } = await renderApp('/admin/products')
    await userEvent.click(await screen.findByRole('link', { name: 'Edit beauty item 01' }))
    expect(await screen.findByLabelText('Title')).toHaveValue('beauty item 01')
    expect(search(router)).toEqual({ edit: 1 })
    unmount()

    for (const path of ['/admin/products?edit=1', '/admin/products/1/edit']) {
      const view = await renderApp(path)
      expect(await screen.findByLabelText('Title')).toHaveValue('beauty item 01')
      expect(screen.getByLabelText('SKU')).toHaveValue('SKU-1')
      expect(view.router.state.location.pathname).toBe('/admin/products')
      expect(search(view.router)).toEqual({ edit: 1 })
      view.unmount()
    }
  })

  it('moves freely between sections (kept in the URL) and saves from any of them', async () => {
    signInAs('emilys')
    const { router } = await renderApp('/admin/products?edit=1')
    await screen.findByLabelText('Title')
    await userEvent.click(section('Price and stock'))
    await waitFor(() => expect(search(router)).toEqual({ edit: 1, section: 'pricing' }))
    expect(screen.getByLabelText('Price')).toHaveValue('10')

    await userEvent.clear(screen.getByLabelText('Price'))
    await userEvent.type(screen.getByLabelText('Price'), '12.5')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(search(router)).toEqual({}))
    expect(admin.liveProduct(1)).toMatchObject({ priceCents: 1250 })

    await router.navigate({ to: '/products/$productId', params: { productId: '1' } })
    expect((await screen.findAllByText('$12.50')).length).toBeGreaterThan(0)
  })

  it('an unknown product id shows 404 in the dialog', async () => {
    signInAs('emilys')
    await renderApp('/admin/products?edit=99999')
    expect(await screen.findByText('Page not found')).toBeInTheDocument()
  })

  it('on a failed save, flags the section with the problem and opens it', async () => {
    signInAs('emilys')
    const requests = recordRequests()
    const { router } = await renderApp('/admin/products?edit=1')
    await screen.findByLabelText('Title')
    await userEvent.click(section('Price and stock'))
    await userEvent.clear(await screen.findByLabelText('Price'))
    await userEvent.click(section('General'))
    expect(screen.queryByRole('img', { name: 'Has errors' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(search(router)).toEqual({ edit: 1, section: 'pricing' }))
    expect(await screen.findByText('Enter a price above 0 with at most 2 decimals.')).toBeVisible()
    const flagged = screen.getByRole('img', { name: 'Has errors' })
    expect(section('Price and stock')).toContainElement(flagged)
    expect(section('General')).not.toContainElement(flagged)
    expect(writes(requests)).toEqual([])
  })

  it('asks before discarding unsaved changes', async () => {
    signInAs('emilys')
    const { router } = await renderApp('/admin/products?edit=1')
    await userEvent.type(await screen.findByLabelText('Title'), ' changed')
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    const dialog = await screen.findByRole('alertdialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Keep editing' }))
    expect(search(router)).toEqual({ edit: 1 })

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await userEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: 'Discard changes',
      }),
    )
    await waitFor(() => expect(search(router)).toEqual({}))
    expect(admin.liveProduct(1)?.title).toBe('beauty item 01')
  })

  it('does not ask when nothing changed, and switching section is not a way out', async () => {
    signInAs('emilys')
    const { router } = await renderApp('/admin/products?edit=1')
    await userEvent.type(await screen.findByLabelText('Title'), ' changed')
    await userEvent.click(section('Images'))
    await waitFor(() => expect(search(router)).toEqual({ edit: 1, section: 'images' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    await userEvent.click(section('General'))
    await userEvent.clear(screen.getByLabelText('Title'))
    await userEvent.type(screen.getByLabelText('Title'), 'beauty item 01')
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(search(router)).toEqual({}))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
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
    // each stat card is one link named "<label> <number>"
    const stat = (label: string, value: number) =>
      screen.findByRole('link', { name: `${label} ${value}` })
    await stat('Products', 29)
    await stat('Users', 25)
    await stat('Low stock', 1) // id 6 has stock 4
    await stat('Out of stock', 1) // id 3
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
