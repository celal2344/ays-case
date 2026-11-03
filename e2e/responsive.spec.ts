import type { Page } from '@playwright/test'

import { expect, signIn, test } from './support/app'

async function overflow(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
}

test('no page scrolls sideways at the desktop or phone viewport', async ({ page }) => {
  test.setTimeout(120_000)
  await signIn(page, 'admin')
  await page.goto('/products/2')
  await page.getByRole('button', { name: 'Buy now' }).first().click()
  await expect(page).toHaveURL(/\/checkout$/)

  const paths = [
    '/login',
    '/products',
    '/products?view=table',
    '/products/2',
    '/cart',
    '/checkout',
    '/orders',
    '/admin',
    '/admin/products',
    '/admin/products/new',
    '/admin/users',
    '/admin/users/new',
    '/forbidden',
    '/nope',
  ]
  for (const path of paths) {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    expect({ path, overflow: await overflow(page) }).toEqual({ path, overflow: 0 })
  }
})
