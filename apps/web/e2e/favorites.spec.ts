import { expect, signIn, test } from './support/app'

test('favorite two products, open the favorites page and remove one', async ({ page }) => {
  await signIn(page, 'user')
  await page.goto('/products')
  await page.getByRole('button', { name: 'Add beauty item 01 to favorites' }).click()
  await page.getByRole('button', { name: 'Add groceries item 02 to favorites' }).click()
  await expect(page.getByRole('link', { name: 'Favorites, 2 items' })).toBeVisible()

  await page.getByRole('link', { name: 'Favorites, 2 items' }).click()
  await expect(page).toHaveURL(/\/favorites$/)
  await expect(page.getByRole('link', { name: 'groceries item 02' }).first()).toBeVisible()

  await page.getByRole('button', { name: 'Remove groceries item 02 from favorites' }).click()
  await expect(page.getByRole('link', { name: 'groceries item 02' })).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('link', { name: 'beauty item 01' }).first()).toBeVisible()
})
