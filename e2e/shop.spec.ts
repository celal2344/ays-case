import { expect, signIn, test } from './support/app'

test('search, category, sort and paging are reflected in the URL and the list', async ({
  page,
}) => {
  await page.goto('/products')
  await expect(page.getByRole('link', { name: 'beauty item 01' }).first()).toBeVisible()
  await expect(page.getByText('Showing 1–12 of 30')).toBeVisible()

  await page.getByRole('button', { name: 'Next' }).first().click()
  await expect(page).toHaveURL(/page=2/)
  await expect(page.getByText('Showing 13–24 of 30')).toBeVisible()

  await page.getByRole('searchbox', { name: 'Search products' }).fill('item 07')
  await expect(page).toHaveURL(/q=item(\+|%20)07/)
  await expect(page.getByRole('link', { name: 'beauty item 07' }).first()).toBeVisible()
  await expect(page.getByText('Showing 1–1 of 1')).toBeVisible()

  await page.getByRole('searchbox', { name: 'Search products' }).fill('')
  await page.getByRole('combobox', { name: 'Sort by' }).click()
  await page.getByRole('option', { name: 'Price: high to low' }).click()
  await expect(page).toHaveURL(/sort=price/)
  await expect(page.getByRole('link', { name: 'smartphones item 30' }).first()).toBeVisible()
})

test('the pager jumps to any page: by number and with go-to-page', async ({ page, isMobile }) => {
  await page.goto('/products')
  await expect(page.getByText('Showing 1–12 of 30')).toBeVisible()

  await page.getByRole('spinbutton', { name: 'Go to page' }).fill('3')
  await page.getByRole('spinbutton', { name: 'Go to page' }).press('Enter')
  await expect(page).toHaveURL(/page=3/)
  await expect(page.getByText('Showing 25–30 of 30')).toBeVisible()
  await expect(page.locator('#results')).toBeFocused()

  // the numbered buttons are desktop only; phones show "3 / 3" with Previous and Next
  if (isMobile) await page.getByRole('button', { name: 'Previous' }).click()
  else await page.getByRole('button', { name: 'Page 1' }).click()
  await expect(page).toHaveURL(isMobile ? /page=2/ : /^(?!.*page=)/)
  await expect(
    page.getByText(isMobile ? 'Showing 13–24 of 30' : 'Showing 1–12 of 30'),
  ).toBeVisible()

  await page.goBack()
  await expect(page).toHaveURL(/page=3/)
  await page.reload()
  await expect(page.getByText('Showing 25–30 of 30')).toBeVisible()
})

test('open a product, add it to the cart and see it in the cart', async ({ page }) => {
  await signIn(page, 'user')
  await page.goto('/products')
  await page.getByRole('link', { name: 'groceries item 02' }).first().click()
  await expect(page).toHaveURL(/\/products\/2$/)
  await expect(page.getByRole('heading', { name: 'groceries item 02' })).toBeVisible()
  await page.getByRole('button', { name: 'Add to cart' }).first().click()
  await expect(page.getByRole('link', { name: 'Cart, 1 items' })).toBeVisible()
  await page.getByRole('link', { name: 'Cart, 1 items' }).click()
  await expect(page).toHaveURL(/\/cart$/)
  await expect(page.getByRole('link', { name: 'groceries item 02' }).first()).toBeVisible()
  await expect(page.getByTestId('cart-total')).toHaveText('$18.00')
})

test('adding while signed out asks to sign in and adds after logging in', async ({ page }) => {
  await page.goto('/products/2')
  await page.getByRole('button', { name: 'Add to cart' }).first().click()
  await expect(page).toHaveURL(/\/login/)
  await page.getByRole('button', { name: 'Fill user' }).click()
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/products\/2$/)
  await expect(page.getByRole('link', { name: 'Cart, 1 items' })).toBeVisible()
})

test('an unknown product shows the not-found page', async ({ page }) => {
  await page.goto('/products/9999')
  await expect(page.getByText(/not found|could not find/i).first()).toBeVisible()
})

test('no horizontal scroll on the shop list', async ({ page }) => {
  await page.goto('/products')
  await expect(page.getByRole('link', { name: 'beauty item 01' }).first()).toBeVisible()
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
})

test('the category menu reaches any category in two interactions', async ({ page, isMobile }) => {
  await page.goto('/products')
  if (isMobile) {
    await page.getByRole('button', { name: 'Menu' }).click()
    const sheet = page.getByRole('dialog')
    await sheet.getByRole('button', { name: 'Groceries' }).click()
    await sheet.getByRole('link', { name: /^Groceries\s*10$/ }).click()
  } else {
    const nav = page.getByRole('navigation', { name: 'Categories' })
    await nav.getByRole('button', { name: 'Groceries' }).click()
    await page.getByRole('link', { name: /^Groceries\s*10$/ }).click()
  }
  await expect(page).toHaveURL(/category=groceries/)
  await expect(page.getByText('10 results')).toBeVisible()
})

test('the sticky buy bar sits flush under the header on desktop', async ({ page, isMobile }) => {
  test.skip(isMobile, 'the bar is a bottom bar on phones')
  await signIn(page, 'user')
  await page.goto('/products/2')
  await expect(page.getByRole('heading', { name: 'groceries item 02' })).toBeVisible()
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2))
  const bar = page.getByRole('region', { name: 'Quick add to cart' })
  await expect(bar).toBeVisible()
  const header = await page.locator('header').first().boundingBox()
  const box = await bar.boundingBox()
  expect(Math.abs(box!.y - (header!.y + header!.height))).toBeLessThanOrEqual(1)
})
