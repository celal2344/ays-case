import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { signInAs } from '@/test/auth'
import { admin } from '@/test/msw/handlers'
import { renderApp } from '@/test/render'
import { only, recordRequests } from '@/test/requests'

describe('admin deletes: one confirm is one request (spam-click guards)', () => {
  it('a double click on the product delete confirm sends one DELETE', async () => {
    signInAs('emilys')
    const requests = recordRequests()
    await renderApp('/admin/products')
    fireEvent.click(await screen.findByRole('button', { name: 'Delete groceries item 02' }))
    const confirm = within(await screen.findByRole('alertdialog')).getByRole('button', {
      name: 'Delete',
    })
    fireEvent.click(confirm)
    fireEvent.click(confirm)

    expect(
      await screen.findByText('groceries item 02 was deleted.', {}, { timeout: 4000 }),
    ).toBeInTheDocument()
    expect(only(requests, 'DELETE /api/products')).toEqual(['DELETE /api/products/2'])
  })

  it('a double click on the user delete confirm sends one DELETE', async () => {
    signInAs('emilys')
    const requests = recordRequests()
    await renderApp('/admin/users')
    fireEvent.click(await screen.findByRole('button', { name: 'Delete Avery Perez' }))
    const confirm = within(await screen.findByRole('alertdialog')).getByRole('button', {
      name: 'Delete',
    })
    fireEvent.click(confirm)
    fireEvent.click(confirm)

    expect(await screen.findByText('Avery Perez was deleted.')).toBeInTheDocument()
    await waitFor(() => expect(admin.users.some((u) => u.id === 'user-16')).toBe(false))
    expect(only(requests, 'DELETE /api/users')).toEqual(['DELETE /api/users/user-16'])
  })
})
