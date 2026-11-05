import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'

import { serveCatalog } from '@/test/catalog'
import { cat, fixtureCategories } from '@/test/fixtures/products'
import { server } from '@/test/msw/server'
import { renderApp } from '@/test/render'

import {
  featuredOf,
  GROUP_IDS,
  groupCategories,
  groupOf,
} from '@/features/products/category-groups'
import type { Product } from '@/features/products/schemas'

const search = (router: { state: { location: { search: unknown } } }) =>
  router.state.location.search
const categories = (slugs: string[]) => slugs.map((slug) => cat(slug))
const product = (category: string) => ({ category: cat(category) })

describe('groupCategories', () => {
  it('puts known slugs in their group, unknown ones in Other, in a fixed group order', () => {
    const groups = groupCategories(
      categories(['smartphones', 'mens-shirts', 'pet-toys', 'laptops']),
      [product('smartphones'), product('mens-shirts'), product('pet-toys'), product('laptops')],
    )
    expect(groups.map((g) => g.id)).toEqual(['electronics', 'men', 'other'])
    expect(groups[0]?.categories.map((c) => c.slug)).toEqual(['laptops', 'smartphones'])
    expect(groups[2]?.categories.map((c) => c.slug)).toEqual(['pet-toys'])
  })

  it('counts products per category and per group', () => {
    const [electronics] = groupCategories(categories(['laptops', 'tablets']), [
      product('laptops'),
      product('laptops'),
      product('tablets'),
    ])
    expect(electronics?.categories.map((c) => c.count)).toEqual([2, 1])
    expect(electronics?.count).toBe(3)
  })

  it('leaves out categories without products and groups without categories', () => {
    expect(groupCategories(categories(['laptops', 'beauty']), [product('beauty')])).toEqual([
      { id: 'beauty', count: 1, categories: [{ slug: 'beauty', name: 'beauty', count: 1 }] },
    ])
    expect(groupCategories([], [])).toEqual([])
  })

  it('maps all 24 catalog categories to a real group (none falls into Other)', () => {
    const slugs =
      `beauty fragrances furniture groceries home-decoration kitchen-accessories laptops mens-shirts mens-shoes mens-watches mobile-accessories motorcycle skin-care smartphones sports-accessories sunglasses tablets tops vehicle womens-bags womens-dresses womens-jewellery womens-shoes womens-watches`.split(
        ' ',
      )
    expect(slugs).toHaveLength(24)
    for (const slug of slugs) expect(groupOf(slug)).not.toBe('other')
    expect(GROUP_IDS.at(-1)).toBe('other')
  })
})

describe('mega-menu navigation', () => {
  it('opens a group, shows its categories with counts and navigates to the category', async () => {
    const { router } = await renderApp('/products')
    const nav = await screen.findByRole('navigation', { name: 'Categories' })
    await userEvent.click(await within(nav).findByRole('button', { name: 'Groceries' }))
    const link = await screen.findByRole('link', { name: /^Groceries\s*10 products$/ })
    await userEvent.click(link)
    await waitFor(() => expect(search(router)).toEqual({ category: 'groceries' }))
    expect(await screen.findByText('10 results')).toBeInTheDocument()
  })

  it('"View all in <group>" filters by the whole group and shows a chip', async () => {
    const { router } = await renderApp('/products')
    const nav = await screen.findByRole('navigation', { name: 'Categories' })
    await userEvent.click(await within(nav).findByRole('button', { name: 'Beauty & Care' }))
    await userEvent.click(
      await screen.findByRole('link', { name: /All Beauty & Care products \(10\)/ }),
    )
    await waitFor(() => expect(search(router)).toEqual({ group: 'beauty' }))
    expect(await screen.findByText('Group: Beauty & Care')).toBeInTheDocument()
    // beauty is the only fixture category of that group: ids 1, 4, 7 …
    expect(await screen.findByText('10 results')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Remove filter: Group/ }))
    await waitFor(() => expect(search(router)).toEqual({}))
  })

  it('a product in a category the map does not know shows up under Other, and counts follow the catalog', async () => {
    server.use(
      http.get('http://localhost/api/categories', () =>
        HttpResponse.json({ data: [...fixtureCategories, cat('pet-toys', 'Pet Toys')] }),
      ),
    )
    serveCatalog((products) => [
      { ...products[0]!, id: 100, title: 'Plush mouse', category: cat('pet-toys', 'Pet Toys') },
      ...products,
    ])
    await renderApp('/products')
    const nav = await screen.findByRole('navigation', { name: 'Categories' })
    await userEvent.click(await within(nav).findByRole('button', { name: 'Other' }))
    expect(await screen.findByRole('link', { name: /Pet Toys\s*1/ })).toBeInTheDocument()
  })

  it('groups with no products are not rendered', async () => {
    serveCatalog((products) => products.filter((p) => p.category.slug !== 'groceries'))
    await renderApp('/products')
    const nav = await screen.findByRole('navigation', { name: 'Categories' })
    await within(nav).findByRole('button', { name: 'Beauty & Care' })
    expect(within(nav).queryByRole('button', { name: 'Groceries' })).not.toBeInTheDocument()
  })

  it('highlights the group of the current category', async () => {
    await renderApp('/products?category=groceries')
    const nav = await screen.findByRole('navigation', { name: 'Categories' })
    const trigger = await within(nav).findByRole('button', { name: 'Groceries' })
    expect(trigger.classList.contains('after:scale-x-100')).toBe(true)
  })

  it('the phone menu lists the same groups as an accordion', async () => {
    const { router } = await renderApp('/products')
    await userEvent.click(await screen.findByRole('button', { name: 'Menu' }))
    const sheet = await screen.findByRole('dialog')
    await userEvent.click(await within(sheet).findByRole('button', { name: 'Groceries' }))
    await userEvent.click(await within(sheet).findByRole('link', { name: /^Groceries\s*10$/ }))
    await waitFor(() => expect(search(router)).toEqual({ category: 'groceries' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})

describe('featuredOf', () => {
  const item = (id: number, category: string, over: Partial<Product> = {}) =>
    ({
      id,
      category: cat(category),
      thumbnail: `https://img.test/${id}.png`,
      rating: null,
      reviewCount: 0,
      discountPercentage: 0,
      ...over,
    }) as Product

  it('picks the two best rated products of the group plus the biggest discount', () => {
    const picked = featuredOf('electronics', [
      item(1, 'laptops', { rating: 4.5, reviewCount: 9 }),
      item(2, 'tablets', { rating: 4.9, reviewCount: 2 }),
      item(3, 'smartphones', { rating: 4.5, reviewCount: 3 }),
      item(4, 'laptops', { discountPercentage: 30 }),
      item(5, 'laptops', { discountPercentage: 10 }),
      item(6, 'beauty', { rating: 5, discountPercentage: 50 }),
    ])
    expect(picked.map((f) => [f.product.id, f.reason])).toEqual([
      [2, 'rating'],
      [1, 'rating'],
      [4, 'discount'],
    ])
  })

  it('skips products without an image and returns nothing for an empty group', () => {
    expect(featuredOf('men', [item(1, 'mens-shirts', { rating: 5, thumbnail: null })])).toEqual([])
    expect(featuredOf('home', [])).toEqual([])
  })
})

describe('mega-menu accessibility (disclosure navigation)', () => {
  it('uses buttons with aria-expanded and a panel of plain links, closed by Escape', async () => {
    await renderApp('/products')
    const nav = await screen.findByRole('navigation', { name: 'Categories' })
    const button = await within(nav).findByRole('button', { name: 'Groceries' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(await screen.findByRole('link', { name: /^Groceries\s*10 products$/ })).toBeVisible()
    expect(screen.queryByRole('menu')).toBeNull()
    expect(screen.queryByRole('menuitem')).toBeNull()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(button).toHaveAttribute('aria-expanded', 'false'))
  })
})
