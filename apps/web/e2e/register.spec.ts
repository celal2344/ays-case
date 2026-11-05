import { expect, test } from './support/app'

async function fill(
  page: import('@playwright/test').Page,
  username = 'celal',
  email = 'celal@example.test',
) {
  await page.getByLabel('First name').fill('Celal')
  await page.getByLabel('Last name').fill('Özdemir')
  await page.getByLabel('Username').fill(username)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill('a-long-password')
  await page.getByLabel('Confirm password').fill('a-long-password')
}

test('a visitor registers, is signed in and lands where they started', async ({ page }) => {
  await page.goto('/login?redirect=%2Fcart')
  await page.getByRole('link', { name: 'Sign up' }).click()
  await expect(page).toHaveURL(/\/register\?redirect=%2Fcart/)
  await fill(page)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL(/\/cart$/)
  await expect(page.getByRole('button', { name: 'Celal Özdemir' })).toBeVisible()
})

test('a taken username is reported on the username field', async ({ page }) => {
  await page.goto('/register')
  await fill(page, 'emilys')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByText('This username is taken.')).toBeVisible()
  await expect(page.getByLabel('Username')).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByLabel('Email')).not.toHaveAttribute('aria-invalid', 'true')
})

test('signing in works with an email as well as a username', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Username or email').fill('averyp@example.com')
  await page.getByLabel('Password', { exact: true }).fill('averyppass')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/products/)
})

test('on a phone the brand panel is gone and the form fills the width', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'phone layout')
  await page.goto('/register')
  await expect(page.getByRole('region', { name: 'ays-case' })).toBeHidden()
  const box = await page.getByRole('button', { name: 'Create account' }).boundingBox()
  expect(box?.width ?? 0).toBeGreaterThan(300)
})
