import type { Page } from '@playwright/test'

import { expect, signIn, test } from './support/app'

async function fillShipping(page: Page) {
  await page.getByLabel('Full name').fill('Avery Perez')
  await page.getByLabel('Address').fill('1 Main Street')
  await page.getByLabel('City').fill('Izmir')
  await page.getByLabel('Phone').fill('5551112233')
}

test('cart → checkout validation → order placed → history', async ({ page }) => {
  await signIn(page, 'user')
  await page.goto('/products/2')
  await page.getByRole('button', { name: 'Buy now' }).first().click()
  await expect(page).toHaveURL(/\/checkout$/)
  await expect(page.getByTestId('checkout-total')).toHaveText('$18.00')

  await page.getByRole('button', { name: 'Place order' }).click()
  await expect(page.getByText('Enter your full name (2–80 characters).')).toBeVisible()
  await expect(page.getByText('Enter a valid phone number.')).toBeVisible()

  await fillShipping(page)
  await page.getByRole('button', { name: 'Place order' }).click()

  await expect(page).toHaveURL(/\/orders\/.+placed=1/)
  await expect(page.getByText('Thank you, your order is placed!')).toBeVisible()
  await expect(page.getByTestId('order-total')).toHaveText('$18.00')

  await page.goto('/orders')
  await expect(page.getByRole('link', { name: /Order #/ })).toHaveCount(1)
  await page.goto('/checkout')
  await expect(page).toHaveURL(/\/cart$/) // the cart is empty now
})

test('the order survives a reload and the stock dropped', async ({ page }) => {
  await signIn(page, 'user')
  await page.goto('/products/6') // stock 4
  await page.getByRole('button', { name: 'Buy now' }).first().click()
  await fillShipping(page)
  await page.getByRole('button', { name: 'Place order' }).click()
  await expect(page).toHaveURL(/placed=1/)
  await page.reload()
  await expect(page.getByTestId('order-total')).toHaveText('$54.00')
  await page.goto('/products/6')
  await expect(page.getByText('Only 3 left').first()).toBeVisible()
})
