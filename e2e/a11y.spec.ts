import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'

import { expect, signIn, test } from './support/app'

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

async function violations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze()
  return violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    nodes: v.nodes.slice(0, 3).map((n) => n.target.join(' ')),
  }))
}

const PUBLIC = ['/login', '/products', '/products/2']

for (const theme of ['light', 'dark'] as const) {
  test.describe(`${theme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((value) => localStorage.setItem('theme', value), theme)
    })

    for (const path of PUBLIC) {
      test(`${path} has no WCAG A/AA violations`, async ({ page }) => {
        await page.goto(path)
        await expect(page.locator('main, #root').first()).toBeVisible()
        await page.waitForLoadState('networkidle')
        expect(await violations(page)).toEqual([])
      })
    }

    test('cart, checkout, orders and admin pages have no WCAG A/AA violations', async ({
      page,
    }) => {
      test.setTimeout(120_000) // seven pages, each scanned: slow under parallel load
      await signIn(page, 'admin')
      await page.goto('/products/2')
      await page.getByRole('button', { name: 'Buy now' }).first().click()
      await expect(page).toHaveURL(/\/checkout$/)
      await page.waitForLoadState('networkidle')
      expect(await violations(page)).toEqual([])

      for (const path of ['/cart', '/orders', '/admin', '/admin/products', '/admin/users']) {
        await page.goto(path)
        await page.waitForLoadState('networkidle')
        expect({ path, found: await violations(page) }).toEqual({ path, found: [] })
      }
    })
  })
}
