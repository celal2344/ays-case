import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { afterEach, describe, expect, it } from 'vitest'

import { useCartStore } from '@/features/cart/store'
import { useProductOverlayStore } from '@/features/products/overlay-store'
import { useReviewsStore } from '@/features/reviews/store'
import { signInAs } from '@/test/auth'
import { server } from '@/test/msw/server'
import { renderApp } from '@/test/render'

/** Records every request the app makes while a test runs. */
function recordRequests() {
  const seen: string[] = []
  server.events.on('request:start', ({ request }) => {
    seen.push(`${request.method} ${new URL(request.url).pathname}`)
  })
  return seen
}

afterEach(() => server.events.removeAllListeners())

const search = (router: { state: { location: { search: unknown } } }) =>
  router.state.location.search
const rowOf = (title: string) => screen.getByText(title).closest('tr')!

async function fillForm(values: {
  title: string
  price: string
  stock?: string
  category?: string
}) {
  await userEvent.type(screen.getByLabelText('Title'), values.title)
  await userEvent.type(screen.getByLabelText('Description'), 'A perfectly reasonable description.')
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
    expect(screen.getByText('Enter a price above 0 with at most 2 decimals.')).toBeInTheDocument()
    expect(requests.filter((r) => r.startsWith('POST'))).toEqual([])
  })

  it('sends POST /products/add, stores a local product and shows it first in the shop, then after reload', async () => {
    signInAs('emilys')
    const requests = recordRequests()
    const { router } = await renderApp('/admin/products/new')
    await fillForm({ title: 'Brand new gadget', price: '49.9', stock: '12' })
    await userEvent.click(screen.getByRole('button', { name: 'Create product' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/products'))
    expect(requests.filter((r) => r === 'POST /products/add')).toHaveLength(1)

    const created = Object.values(useProductOverlayStore.getState().created)
    expect(created).toHaveLength(1)
    expect(created[0]).toMatchObject({
      id: 100_000,
      title: 'Brand new gadget',
      price: 49.9,
      stock: 12,
    })

    // visible in the admin table (newest first) and in the shop
    expect(await screen.findByText('Showing 1–20 of 31')).toBeInTheDocument()
    expect(within(screen.getAllByRole('row')[1]!).getByText('Brand new gadget')).toBeInTheDocument()
    await router.navigate({ to: '/products' })
    expect(await screen.findByText('Brand new gadget')).toBeInTheDocument()

    // survives a reload: the persisted overlay rehydrates
    await useProductOverlayStore.persist.rehydrate()
    expect(Object.keys(useProductOverlayStore.getState().created)).toEqual(['100000'])
  })

  it('shows the error and stores nothing when DummyJSON rejects the request', async () => {
    signInAs('emilys')
    server.use(
      http.post('https://dummyjson.com/products/add', () =>
        HttpResponse.json({ message: 'nope' }, { status: 400 }),
      ),
    )
    const { router } = await renderApp('/admin/products/new')
    await fillForm({ title: 'Rejected gadget', price: '5' })
    await userEvent.click(screen.getByRole('button', { name: 'Create product' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('nope')
    expect(router.state.location.pathname).toBe('/admin/products/new')
    expect(Object.keys(useProductOverlayStore.getState().created)).toEqual([])
  })

  it('previews the thumbnail URL as you type', async () => {
    signInAs('emilys')
    await renderApp('/admin/products/new')
    await userEvent.type(
      await screen.findByLabelText('Thumbnail URL (optional)'),
      'https://img.test/x.webp',
    )
    expect(screen.getByRole('img', { name: 'Thumbnail preview' })).toHaveAttribute(
      'src',
      'https://img.test/x.webp',
    )
  })
})

describe('edit a product (PROD-4)', () => {
  it('pre-fills the form; saving a remote product sends PUT and updates the shop and the detail page', async () => {
    signInAs('emilys')
    const requests = recordRequests()
    const { router } = await renderApp('/admin/products/1/edit')
    expect(await screen.findByLabelText('Title')).toHaveValue('beauty item 01')
    expect(screen.getByLabelText('Price')).toHaveValue('10')

    await userEvent.clear(screen.getByLabelText('Price'))
    await userEvent.type(screen.getByLabelText('Price'), '12.5')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/products'))

    expect(requests.filter((r) => r === 'PUT /products/1')).toHaveLength(1)
    expect(useProductOverlayStore.getState().patched[1]).toMatchObject({ price: 12.5 })

    await router.navigate({ to: '/products/$productId', params: { productId: '1' } })
    expect((await screen.findAllByText('$12.50')).length).toBeGreaterThan(0)
  })

  it('editing a locally created product makes no network request', async () => {
    signInAs('emilys')
    const local = useProductOverlayStore.getState().create({
      title: 'Local thing',
      description: 'A product made by the admin earlier.',
      category: 'beauty',
      price: 5,
      discountPercentage: 0,
      rating: 0,
      stock: 3,
      thumbnail: '',
      tags: ['beauty'],
    })
    const requests = recordRequests()
    const { router } = await renderApp(`/admin/products/${local.id}/edit`)
    const title = await screen.findByLabelText('Title')
    await userEvent.clear(title)
    await userEvent.type(title, 'Local thing v2')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/products'))
    expect(useProductOverlayStore.getState().created[local.id]?.title).toBe('Local thing v2')
    expect(requests.filter((r) => /^(PUT|POST|DELETE)/.test(r))).toEqual([])
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
    expect(useProductOverlayStore.getState().patched[1]).toBeUndefined()
  })

  it('does not ask when nothing changed', async () => {
    signInAs('emilys')
    const { router } = await renderApp('/admin/products/1/edit')
    await userEvent.click(await screen.findByRole('link', { name: 'Cancel' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/products'))
  })
})

describe('delete a product (PROD-5)', () => {
  it('asks to confirm, sends DELETE, and removes the product from the shop, detail page, carts and reviews', async () => {
    signInAs('emilys')
    useCartStore.getState().add(16, 2, 1, 50)
    useReviewsStore.getState().add({
      productId: 2,
      userId: 16,
      authorName: 'Avery Perez',
      rating: 4,
      comment: 'Quite good indeed.',
    })
    const requests = recordRequests()
    const { router } = await renderApp('/admin/products')
    await userEvent.click(await screen.findByRole('button', { name: 'Delete groceries item 02' }))

    const dialog = await screen.findByRole('alertdialog')
    expect(requests.filter((r) => r.startsWith('DELETE'))).toEqual([]) // nothing yet
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('groceries item 02 was deleted.')).toBeInTheDocument()
    expect(requests.filter((r) => r === 'DELETE /products/2')).toHaveLength(1)
    expect(screen.queryByText('Showing 1–20 of 30')).not.toBeInTheDocument()
    expect(await screen.findByText('Showing 1–20 of 29')).toBeInTheDocument()
    expect(useProductOverlayStore.getState().deleted).toEqual([2])
    expect(useCartStore.getState().byUser[16]).toEqual([])
    expect(useReviewsStore.getState().byProduct[2]).toBeUndefined()

    await router.navigate({ to: '/products/$productId', params: { productId: '2' } })
    expect(await screen.findByText('Page not found')).toBeInTheDocument()
  })

  it('cancel keeps the product', async () => {
    signInAs('emilys')
    await renderApp('/admin/products')
    await userEvent.click(await screen.findByRole('button', { name: 'Delete groceries item 02' }))
    await userEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cancel' }),
    )
    expect(useProductOverlayStore.getState().deleted).toEqual([])
    expect(screen.getByText('groceries item 02')).toBeInTheDocument()
  })

  it('deleting a locally created product makes no network request', async () => {
    signInAs('emilys')
    const local = useProductOverlayStore.getState().create({
      title: 'Short lived',
      description: 'A product that will not last.',
      category: 'beauty',
      price: 5,
      discountPercentage: 0,
      rating: 0,
      stock: 3,
      thumbnail: '',
      tags: ['beauty'],
    })
    const requests = recordRequests()
    await renderApp('/admin/products')
    await userEvent.click(await screen.findByRole('button', { name: 'Delete Short lived' }))
    await userEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Delete' }),
    )
    expect(await screen.findByText('Short lived was deleted.')).toBeInTheDocument()
    expect(useProductOverlayStore.getState().created[local.id]).toBeUndefined()
    expect(requests.filter((r) => /^(PUT|POST|DELETE)/.test(r))).toEqual([])
  })

  it('keeps the product and reports the error when DummyJSON fails', async () => {
    signInAs('emilys')
    server.use(
      http.delete('https://dummyjson.com/products/2', () =>
        HttpResponse.json({ message: 'boom' }, { status: 500 }),
      ),
    )
    await renderApp('/admin/products')
    await userEvent.click(await screen.findByRole('button', { name: 'Delete groceries item 02' }))
    await userEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Delete' }),
    )
    expect(await screen.findByText('boom')).toBeInTheDocument()
    expect(useProductOverlayStore.getState().deleted).toEqual([])
    expect(rowOf('groceries item 02')).toBeInTheDocument()
  })
})

describe('dashboard (EX-13, EX-15)', () => {
  it('shows product, low-stock, out-of-stock and local-change counts', async () => {
    signInAs('emilys')
    useProductOverlayStore.getState().update(1, { price: 11 })
    useProductOverlayStore.getState().remove(2)
    await renderApp('/admin')
    // "Products" is also the nav link, so pick the label that sits inside a stat card
    const stat = (label: string) =>
      screen
        .getAllByText(label)
        .map((el) => el.closest('[data-slot="card"]'))
        .find((card): card is HTMLElement => card !== null)!
    await screen.findByText('Local changes')
    expect(within(stat('Products')).getByText('29')).toBeInTheDocument()
    expect(within(stat('Low stock (≤ 5)')).getByText('1')).toBeInTheDocument() // id 6 has stock 4
    expect(within(stat('Out of stock')).getByText('1')).toBeInTheDocument() // id 3
    expect(within(stat('Local changes')).getByText('2')).toBeInTheDocument()
  })

  it('Reset demo data restores the original catalog and clears reviews and carts, after confirming', async () => {
    signInAs('emilys')
    useProductOverlayStore.getState().remove(2)
    useProductOverlayStore.getState().update(1, { price: 99 })
    useCartStore.getState().add(16, 4, 1, 50)
    useReviewsStore.getState().add({
      productId: 4,
      userId: 16,
      authorName: 'Avery Perez',
      rating: 4,
      comment: 'Quite good indeed.',
    })
    await renderApp('/admin')
    await userEvent.click(await screen.findByRole('button', { name: 'Reset demo data' }))
    expect(useProductOverlayStore.getState().deleted).toEqual([2]) // not yet

    await userEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Reset' }),
    )
    expect(await screen.findByText('Demo data was reset.')).toBeInTheDocument()
    expect(useProductOverlayStore.getState()).toMatchObject({
      created: {},
      patched: {},
      deleted: [],
    })
    expect(useCartStore.getState().byUser).toEqual({})
    expect(useReviewsStore.getState().byProduct).toEqual({})
    const cards = screen.getAllByText('Products').map((el) => el.closest('[data-slot="card"]'))
    expect(
      within(cards.find((c): c is HTMLElement => c !== null)!).getByText('30'),
    ).toBeInTheDocument()
  })
})
