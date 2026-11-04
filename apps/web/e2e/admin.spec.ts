import { expect, signIn, test } from './support/app'

test('admin creates, edits and deletes a product, and the shop follows', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'the admin tables are a desktop workflow')
  await signIn(page, 'admin')

  await page.goto('/admin/products/new')
  await page.getByLabel('Title').fill('E2E Gadget')
  await page.getByLabel('Description').fill('A gadget created by the end-to-end test.')
  await page.getByRole('combobox', { name: 'Category' }).click()
  await page.getByRole('option', { name: 'Beauty' }).click()
  await page.getByLabel('Price').fill('25')
  await page.getByLabel('Discount %').fill('0')
  await page.getByLabel('Stock').fill('7')
  await page.getByRole('button', { name: 'Create product' }).click()
  await expect(page).toHaveURL(/\/admin\/products$/)

  await page.goto('/products?q=E2E')
  await expect(page.getByRole('link', { name: 'E2E Gadget' }).first()).toBeVisible()

  await page.goto('/admin/products?q=E2E')
  await page.getByRole('link', { name: 'Edit E2E Gadget' }).click()
  await page.getByLabel('Title').fill('E2E Gadget Pro')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page).toHaveURL(/\/admin\/products/)

  await page.goto('/products?q=E2E')
  await expect(page.getByRole('link', { name: 'E2E Gadget Pro' }).first()).toBeVisible()

  await page.goto('/admin/products?q=E2E')
  await page.getByRole('button', { name: 'Delete E2E Gadget Pro' }).click()
  await page.getByRole('button', { name: 'Delete', exact: true }).click()

  await page.goto('/products?q=E2E')
  await expect(page.getByRole('link', { name: 'E2E Gadget Pro' })).toHaveCount(0)
})

test('admins cannot delete themselves in the users table', async ({ page, isMobile }) => {
  test.skip(isMobile, 'the admin tables are a desktop workflow')
  await signIn(page, 'admin')
  await page.goto('/admin/users')
  await expect(page.getByRole('button', { name: /^Delete Emily/ })).toBeDisabled()
})
