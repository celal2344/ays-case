import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { afterEach, describe, expect, it } from 'vitest'

import { useAuthStore } from '@/features/auth/store'
import { signInAs } from '@/test/auth'
import { admin } from '@/test/msw/handlers'
import { server } from '@/test/msw/server'
import { renderApp } from '@/test/render'

function recordRequests() {
  const seen: string[] = []
  server.events.on('request:start', ({ request }) => {
    const { pathname } = new URL(request.url)
    // recording a product view is a normal side effect of opening a page, not an admin write
    if (!pathname.startsWith('/api/recently-viewed')) seen.push(`${request.method} ${pathname}`)
  })
  return seen
}

const writes = (requests: string[]) => requests.filter((r) => /^(PUT|POST|PATCH|DELETE)/.test(r))

afterEach(() => server.events.removeAllListeners())

const search = (router: { state: { location: { search: unknown } } }) =>
  router.state.location.search
const rowOf = (text: string) => screen.getByText(text).closest('tr')!

async function fillUser(values: {
  username: string
  first?: string
  last?: string
  email?: string
}) {
  await userEvent.type(screen.getByLabelText('Username'), values.username)
  await userEvent.type(screen.getByLabelText('First name'), values.first ?? 'Nina')
  await userEvent.type(screen.getByLabelText('Last name'), values.last ?? 'Novak')
  await userEvent.type(screen.getByLabelText('Email'), values.email ?? 'nina@example.com')
  await userEvent.type(screen.getByLabelText('Initial password'), 'a-good-password')
}

describe('access', () => {
  it('non-admins are sent to /forbidden from every users page', async () => {
    signInAs('averyp')
    for (const path of ['/admin/users', '/admin/users/new', '/admin/users/user-3/edit']) {
      const { router, unmount } = await renderApp(path)
      expect(router.state.location.pathname).toBe('/forbidden')
      unmount()
    }
  })

  it('the profile menu offers the admin panel to admins only', async () => {
    signInAs('emilys')
    const { router } = await renderApp('/products')
    await userEvent.click(await screen.findByRole('button', { name: 'Emily Johnson' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Admin panel' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin'))
  })

  it('a normal user has no admin panel entry', async () => {
    signInAs('averyp')
    await renderApp('/products')
    await userEvent.click(await screen.findByRole('button', { name: 'Avery Perez' }))
    expect(await screen.findByRole('menuitem', { name: 'My orders' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Admin panel' })).not.toBeInTheDocument()
  })
})

describe('user table (USER-1)', () => {
  it('lists 20 users per page with avatar, name, email, username, role and actions', async () => {
    signInAs('emilys')
    await renderApp('/admin/users')
    expect(await screen.findByText('Showing 1–20 of 25')).toBeInTheDocument()
    const rows = screen.getAllByRole('row')
    expect(rows).toHaveLength(21)
    const emily = within(rowOf('Emily Johnson'))
    expect(emily.getByText('emilys@example.com')).toBeInTheDocument()
    expect(emily.getByText('emilys')).toBeInTheDocument()
    expect(emily.getByText('Admin')).toBeInTheDocument()
    expect(emily.getByRole('link', { name: 'Edit Emily Johnson' })).toHaveAttribute(
      'href',
      '/admin/users?edit=user-1',
    )
  })

  it('pages, searches and filters by role through the URL', async () => {
    signInAs('emilys')
    const { router } = await renderApp('/admin/users')
    await screen.findByText('Showing 1–20 of 25')
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByText('Showing 21–25 of 25')).toBeInTheDocument()
    expect(search(router)).toEqual({ page: 2 })
  })

  it('reproduces a combined URL', async () => {
    signInAs('emilys')
    await renderApp('/admin/users?role=admin')
    expect(await screen.findByText('Showing 1–2 of 2')).toBeInTheDocument()
  })

  it('searches by name', async () => {
    signInAs('emilys')
    await renderApp('/admin/users?q=perez')
    expect(await screen.findByText('Showing 1–1 of 1')).toBeInTheDocument()
    expect(screen.getByText('Avery Perez')).toBeInTheDocument()
  })

  it('shows an empty state and Clear filters restores the list', async () => {
    signInAs('emilys')
    await renderApp('/admin/users?q=zzzz')
    expect(await screen.findByText('No users match your filters')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(await screen.findByText('Showing 1–20 of 25')).toBeInTheDocument()
  })
})

describe('create a user (USER-2)', () => {
  it('validates before sending anything', async () => {
    signInAs('emilys')
    const requests = recordRequests()
    await renderApp('/admin/users?new=1')
    await userEvent.click(await screen.findByRole('button', { name: 'Create user' }))
    expect(await screen.findByText('Enter a username of 3 to 30 characters.')).toBeInTheDocument()
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument()
    expect(screen.getByText('Enter a password of 8 to 72 characters.')).toBeInTheDocument()
    expect(writes(requests)).toEqual([])
  })

  it('refuses a username that is already taken, case-insensitively, as you type', async () => {
    signInAs('emilys')
    await renderApp('/admin/users?new=1')
    await userEvent.type(await screen.findByLabelText('Username'), 'EMILYS')
    expect(await screen.findByText('That username is already taken.')).toBeInTheDocument()
  })

  it('creates the user on the server and lists it', async () => {
    signInAs('emilys')
    const { router } = await renderApp('/admin/users?new=1')
    await screen.findByLabelText('Username')
    await fillUser({ username: 'nina' })
    await userEvent.click(screen.getByRole('button', { name: 'Create user' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/users'))
    expect(admin.users.find((u) => u.username === 'nina')).toMatchObject({
      firstName: 'Nina',
      role: 'user',
    })
    expect(await screen.findByText('Showing 1–20 of 26')).toBeInTheDocument()
  })

  it('creates an admin when the role is chosen', async () => {
    signInAs('emilys')
    await renderApp('/admin/users?new=1')
    await screen.findByLabelText('Username')
    await fillUser({ username: 'boss' })
    await userEvent.click(screen.getByRole('combobox', { name: 'Role' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Admin' }))
    await userEvent.click(screen.getByRole('button', { name: 'Create user' }))
    await waitFor(() => expect(admin.users.find((u) => u.username === 'boss')?.role).toBe('admin'))
  })

  it('shows the server refusal when the email is already used', async () => {
    signInAs('emilys')
    const { router } = await renderApp('/admin/users?new=1')
    await screen.findByLabelText('Username')
    await fillUser({ username: 'someone', email: 'emilys@example.com' })
    await userEvent.click(screen.getByRole('button', { name: 'Create user' }))
    expect(
      await screen.findByText('A user with that username or email already exists.'),
    ).toBeInTheDocument()
    expect(router.state.location.search).toEqual({ new: 1 })
  })
})

describe('user dialogs and old routes', () => {
  it('opens from the New user button and from the URL; the old routes redirect', async () => {
    signInAs('emilys')
    const first = await renderApp('/admin/users')
    await userEvent.click(await screen.findByRole('link', { name: 'New user' }))
    expect(await screen.findByRole('dialog', { name: 'New user' })).toBeInTheDocument()
    expect(first.router.state.location.search).toEqual({ new: 1 })
    first.unmount()

    for (const [path, search] of [
      ['/admin/users?new=1', { new: 1 }],
      ['/admin/users/new', { new: 1 }],
      ['/admin/users?edit=user-16', { edit: 'user-16' }],
      ['/admin/users/user-16/edit', { edit: 'user-16' }],
    ] as const) {
      const view = await renderApp(path)
      expect(await screen.findByRole('dialog')).toBeInTheDocument()
      expect(view.router.state.location.pathname).toBe('/admin/users')
      expect(view.router.state.location.search).toEqual(search)
      view.unmount()
    }
  })
})

describe('edit a user (USER-3)', () => {
  it('pre-fills the form; saving updates the user on the server, role included', async () => {
    signInAs('emilys')
    const { router } = await renderApp('/admin/users?edit=user-16')
    expect(await screen.findByLabelText('First name')).toHaveValue('Avery')
    expect(screen.getByLabelText('Username')).toHaveValue('averyp')

    await userEvent.clear(screen.getByLabelText('First name'))
    await userEvent.type(screen.getByLabelText('First name'), 'Averie')
    await userEvent.click(screen.getByRole('combobox', { name: 'Role' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Moderator' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/users'))

    expect(admin.users.find((u) => u.id === 'user-16')).toMatchObject({
      firstName: 'Averie',
      role: 'moderator',
    })
    expect(await screen.findByText('Averie Perez')).toBeInTheDocument()
  })

  it('a user can keep their own username while editing, but not take another one', async () => {
    signInAs('emilys')
    await renderApp('/admin/users?edit=user-16')
    const username = await screen.findByLabelText('Username')
    await userEvent.type(username, 'x')
    expect(screen.queryByText('That username is already taken.')).not.toBeInTheDocument()
    await userEvent.clear(username)
    await userEvent.type(username, 'emilys')
    expect(await screen.findByText('That username is already taken.')).toBeInTheDocument()
  })

  it('an unknown user id opens no dialog', async () => {
    signInAs('emilys')
    await renderApp('/admin/users?edit=user-99999')
    await screen.findByText('Manage users')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('asks before discarding unsaved changes', async () => {
    signInAs('emilys')
    const { router } = await renderApp('/admin/users?edit=user-16')
    await userEvent.type(await screen.findByLabelText('First name'), 'x')
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    const dialog = await screen.findByRole('alertdialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Keep editing' }))
    expect(router.state.location.search).toEqual({ edit: 'user-16' })
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await userEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: 'Discard changes',
      }),
    )
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/users'))
    expect(admin.users.find((u) => u.id === 'user-16')?.firstName).toBe('Avery')
  })

  it('editing your own account updates the signed-in user (header) right away', async () => {
    signInAs('emilys')
    await renderApp('/admin/users?edit=user-1')
    const first = await screen.findByLabelText('First name')
    await userEvent.clear(first)
    await userEvent.type(first, 'Emmie')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(useAuthStore.getState().user?.firstName).toBe('Emmie'))
  })
})

describe('delete a user (USER-4)', () => {
  it('asks to confirm, then deletes on the server', async () => {
    signInAs('emilys')
    const requests = recordRequests()
    await renderApp('/admin/users')
    await userEvent.click(await screen.findByRole('button', { name: 'Delete Avery Perez' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(requests.filter((r) => r.startsWith('DELETE'))).toEqual([]) // nothing yet
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('Avery Perez was deleted.')).toBeInTheDocument()
    expect(requests.filter((r) => r.startsWith('DELETE'))).toEqual(['DELETE /api/users/user-16'])
    expect(admin.users.some((u) => u.id === 'user-16')).toBe(false)
    expect(await screen.findByText('Showing 1–20 of 24')).toBeInTheDocument()
  })

  it('cancel keeps the user', async () => {
    signInAs('emilys')
    const requests = recordRequests()
    await renderApp('/admin/users')
    await userEvent.click(await screen.findByRole('button', { name: 'Delete Avery Perez' }))
    await userEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cancel' }),
    )
    expect(writes(requests)).toEqual([])
    expect(admin.users).toHaveLength(25)
  })

  it('shows the server refusal when the delete fails', async () => {
    signInAs('emilys')
    server.use(
      http.delete('http://localhost/api/users/:id', () =>
        HttpResponse.json({ code: 'last_admin', message: 'no' }, { status: 409 }),
      ),
    )
    await renderApp('/admin/users')
    await userEvent.click(await screen.findByRole('button', { name: 'Delete Avery Perez' }))
    await userEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Delete' }),
    )
    expect(
      await screen.findByText('The last admin cannot be deleted or demoted.'),
    ).toBeInTheDocument()
  })
})

describe('guardrails (USER-5)', () => {
  it('your own row cannot be deleted, and your role cannot be changed in the form', async () => {
    signInAs('emilys')
    await renderApp('/admin/users')
    const own = await screen.findByRole('button', { name: 'Delete Emily Johnson' })
    expect(own).toBeDisabled()
    expect(own).toHaveAttribute('title', 'You cannot delete or demote your own account.')
    expect(screen.getByRole('button', { name: 'Delete Michael Williams' })).toBeEnabled() // a second admin exists
  })

  it('the role select is locked on your own account', async () => {
    signInAs('emilys')
    await renderApp('/admin/users?edit=user-1')
    await screen.findByLabelText('First name')
    expect(screen.getByRole('combobox', { name: 'Role' })).toBeDisabled()
    expect(screen.getByText('You cannot delete or demote your own account.')).toBeInTheDocument()
  })

  it('the server refuses what the UI would not offer', () => {
    expect(admin.deleteUser('user-1', 'user-1')).toMatchObject({ code: 'cannot_delete_self' })
    expect(admin.updateUser('user-1', { role: 'user' }, 'user-1')).toMatchObject({
      code: 'cannot_demote_self',
    })
    admin.updateUser('user-1', { role: 'user' }, 'user-2')
    expect(admin.updateUser('user-2', { role: 'user' }, 'user-5')).toMatchObject({
      code: 'last_admin',
    })
  })
})
