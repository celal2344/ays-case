import { expect, signIn, test } from './support/app'

test('a logged-out visit to a protected page goes to login and back after signing in', async ({
  page,
}) => {
  await page.goto('/orders')
  await expect(page).toHaveURL(/\/login\?redirect=%2Forders/)
  await page.getByRole('button', { name: 'Fill user' }).click()
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/orders$/)
  await expect(page.getByRole('heading', { name: 'Orders', exact: true })).toBeVisible()
})

test('invalid credentials show the server message', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Username').fill('emilys')
  await page.getByLabel('Password').fill('nope')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('alert')).toContainText('Invalid username or password')
})

test('the session survives a reload and a user cannot open the admin area', async ({ page }) => {
  await signIn(page, 'user')
  await page.reload()
  await expect(page).toHaveURL(/\/products/)
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/forbidden/)
})

test('an admin opens the dashboard and logs out', async ({ page, isMobile }) => {
  test.skip(isMobile, 'the user menu lives in the mobile sheet; covered by the desktop run')
  await signIn(page, 'admin')
  await page.goto('/admin')
  await expect(page.getByRole('heading', { name: 'Admin' })).toBeVisible()
  await page.getByRole('button', { name: /Emily/ }).click()
  await page.getByRole('menuitem', { name: 'Log out' }).click()
  await expect(page).toHaveURL(/\/login/)
  await page.goto('/cart')
  await expect(page).toHaveURL(/\/login\?redirect/)
})
