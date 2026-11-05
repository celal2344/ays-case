import { expect, test as base, type Page } from '@playwright/test'

import { mockApi } from './mock-api'

/** Every spec starts from a clean browser with the API mocked and the UI in English. */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      if (localStorage.getItem('ays-case:v1:prefs')) return
      localStorage.setItem(
        'ays-case:v1:prefs',
        JSON.stringify({ state: { language: 'en', shopView: 'grid' }, version: 1 }),
      )
    })
    await mockApi(page)
    await use(page)
  },
})

export { expect }

export async function signIn(page: Page, who: 'admin' | 'user') {
  await page.goto('/login')
  await page.getByRole('button', { name: who === 'admin' ? 'Admin' : 'Customer' }).click()
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/products/)
}
