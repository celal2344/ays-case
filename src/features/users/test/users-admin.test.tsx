import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { afterEach, describe, expect, it } from 'vitest'

import { useAuthStore } from '@/features/auth/store'
import { useCartStore } from '@/features/cart/store'
import { signInAs } from '@/test/auth'
import { server } from '@/test/msw/server'
import { renderApp } from '@/test/render'

import { useUserOverlayStore } from '../overlay-store'

function recordRequests() {
  const seen: string[] = []
  server.events.on('request:start', ({ request }) => {
    seen.push(`${request.method} ${new URL(request.url).pathname}`)
  })
  return seen
}

afterEach(() => server.events.removeAllListeners())

const search = (router: { state: { location: { search: unknown } } }) =>
  router.state.location.search
const overlay = () => useUserOverlayStore.getState()
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
}

describe('access', () => {
  it('non-admins are sent to /forbidden from every users page', async () => {
    signInAs('averyp')
    for (const path of ['/admin/users', '/admin/users/new', '/admin/users/3/edit']) {
      const { router, unmount } = await renderApp(path)
      expect(router.state.location.pathname).toBe('/forbidden')
      unmount()
    }
  })

  it('the header Admin menu offers Dashboard, Products and Users to admins only', async () => {
    signInAs('emilys')
    const { router } = await renderApp('/products')
    await userEvent.click(await screen.findByRole('button', { name: /Admin/ }))
    expect(await screen.findByRole('menuitem', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Products' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('menuitem', { name: 'Users' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/users'))
  })

  it('a normal user has no Admin menu', async () => {
    signInAs('averyp')
    await renderApp('/products')
    await screen.findByRole('heading', { name: 'Products' })
    expect(screen.queryByRole('button', { name: /Admin/ })).not.toBeInTheDocument()
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
    expect(
      emily.getByText('emily.johnson@x.dummyjson.com'.replace('emily.johnson', 'emilys')),
    ).toBeInTheDocument()
    expect(emily.getByText('emilys')).toBeInTheDocument()
    expect(emily.getByText('Admin')).toBeInTheDocument()
    expect(emily.getByRole('link', { name: 'Edit Emily Johnson' })).toHaveAttribute(
      'href',
      '/admin/users/1/edit',
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
    await renderApp('/admin/users/new')
    await userEvent.click(await screen.findByRole('button', { name: 'Create user' }))
    expect(await screen.findByText('Enter a username of 3 to 30 characters.')).toBeInTheDocument()
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument()
    expect(requests.filter((r) => r.startsWith('POST'))).toEqual([])
  })

  it('refuses a username that is already taken, case-insensitively, as you type', async () => {
    signInAs('emilys')
    await renderApp('/admin/users/new')
    await userEvent.type(await screen.findByLabelText('Username'), 'EMILYS')
    expect(await screen.findByText('That username is already taken.')).toBeInTheDocument()
  })

  it('sends POST /users/add once and stores a local user that appears first and survives rehydrate', async () => {
    signInAs('emilys')
    const requests = recordRequests()
    const { router } = await renderApp('/admin/users/new')
    await screen.findByLabelText('Username')
    await fillUser({ username: 'nina' })
    await userEvent.click(screen.getByRole('button', { name: 'Create user' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/users'))
    expect(requests.filter((r) => r === 'POST /users/add')).toHaveLength(1)
    const created = Object.values(overlay().created)
    expect(created).toHaveLength(1)
    expect(created[0]).toMatchObject({
      id: 100_000,
      username: 'nina',
      role: 'user',
      firstName: 'Nina',
    })

    expect(await screen.findByText('Showing 1–20 of 26')).toBeInTheDocument()
    expect(within(screen.getAllByRole('row')[1]!).getByText('Nina Novak')).toBeInTheDocument()

    await useUserOverlayStore.persist.rehydrate()
    expect(Object.keys(overlay().created)).toEqual(['100000'])
  })

  it('creates an admin when the role is chosen', async () => {
    signInAs('emilys')
    await renderApp('/admin/users/new')
    await screen.findByLabelText('Username')
    await fillUser({ username: 'boss' })
    await userEvent.click(screen.getByRole('combobox', { name: 'Role' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Admin' }))
    await userEvent.click(screen.getByRole('button', { name: 'Create user' }))
    await waitFor(() => expect(Object.values(overlay().created)[0]?.role).toBe('admin'))
  })

  it('shows the error and stores nothing when DummyJSON rejects the request', async () => {
    signInAs('emilys')
    server.use(
      http.post('https://dummyjson.com/users/add', () =>
        HttpResponse.json({ message: 'nope' }, { status: 400 }),
      ),
    )
    const { router } = await renderApp('/admin/users/new')
    await screen.findByLabelText('Username')
    await fillUser({ username: 'rejected' })
    await userEvent.click(screen.getByRole('button', { name: 'Create user' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('nope')
    expect(router.state.location.pathname).toBe('/admin/users/new')
    expect(overlay().created).toEqual({})
  })
})

describe('edit a user (USER-3)', () => {
  it('pre-fills the form; saving a remote user sends PUT and stores a patch, role included', async () => {
    signInAs('emilys')
    const requests = recordRequests()
    const { router } = await renderApp('/admin/users/16/edit')
    expect(await screen.findByLabelText('First name')).toHaveValue('Avery')
    expect(screen.getByLabelText('Username')).toHaveValue('averyp')

    await userEvent.clear(screen.getByLabelText('First name'))
    await userEvent.type(screen.getByLabelText('First name'), 'Averie')
    await userEvent.click(screen.getByRole('combobox', { name: 'Role' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Moderator' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/users'))

    expect(requests.filter((r) => r === 'PUT /users/16')).toHaveLength(1)
    expect(overlay().patched[16]).toMatchObject({ firstName: 'Averie', role: 'moderator' })
    expect(await screen.findByText('Averie Perez')).toBeInTheDocument()
  })

  it('editing a locally created user makes no network request', async () => {
    signInAs('emilys')
    const local = overlay().create({
      username: 'localo',
      firstName: 'Loc',
      lastName: 'Al',
      email: 'l@x.com',
      image: '',
      role: 'user',
    })
    const requests = recordRequests()
    const { router } = await renderApp(`/admin/users/${local.id}/edit`)
    const first = await screen.findByLabelText('First name')
    await userEvent.clear(first)
    await userEvent.type(first, 'Locke')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/users'))
    expect(overlay().created[local.id]?.firstName).toBe('Locke')
    expect(requests.filter((r) => /^(PUT|POST|DELETE)/.test(r))).toEqual([])
  })

  it('a user can keep their own username while editing, but not take another one', async () => {
    signInAs('emilys')
    await renderApp('/admin/users/16/edit')
    const username = await screen.findByLabelText('Username')
    await userEvent.type(username, 'x')
    expect(screen.queryByText('That username is already taken.')).not.toBeInTheDocument()
    await userEvent.clear(username)
    await userEvent.type(username, 'emilys')
    expect(await screen.findByText('That username is already taken.')).toBeInTheDocument()
  })

  it('an unknown user shows 404', async () => {
    signInAs('emilys')
    await renderApp('/admin/users/99999/edit')
    expect(await screen.findByText('Page not found')).toBeInTheDocument()
  })

  it('asks before discarding unsaved changes', async () => {
    signInAs('emilys')
    const { router } = await renderApp('/admin/users/16/edit')
    await userEvent.type(await screen.findByLabelText('First name'), 'x')
    await userEvent.click(screen.getByRole('link', { name: 'Cancel' }))
    const dialog = await screen.findByRole('alertdialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Keep editing' }))
    expect(router.state.location.pathname).toBe('/admin/users/16/edit')
    await userEvent.click(screen.getByRole('link', { name: 'Cancel' }))
    await userEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: 'Discard changes',
      }),
    )
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/users'))
    expect(overlay().patched[16]).toBeUndefined()
  })

  it('editing your own account updates the signed-in user (header) right away', async () => {
    signInAs('emilys')
    await renderApp('/admin/users/1/edit')
    const first = await screen.findByLabelText('First name')
    await userEvent.clear(first)
    await userEvent.type(first, 'Emmie')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(useAuthStore.getState().user?.firstName).toBe('Emmie'))
  })
})

describe('delete a user (USER-4)', () => {
  it('asks to confirm, sends DELETE, hides the user and clears their cart', async () => {
    signInAs('emilys')
    useCartStore.getState().add(16, 2, 1, 50)
    const requests = recordRequests()
    await renderApp('/admin/users')
    await userEvent.click(await screen.findByRole('button', { name: 'Delete Avery Perez' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(requests.filter((r) => r.startsWith('DELETE'))).toEqual([])
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('Avery Perez was deleted.')).toBeInTheDocument()
    expect(requests.filter((r) => r === 'DELETE /users/16')).toHaveLength(1)
    expect(overlay().deleted).toEqual([16])
    expect(useCartStore.getState().byUser[16]).toEqual([])
    expect(await screen.findByText('Showing 1–20 of 24')).toBeInTheDocument()
  })

  it('cancel keeps the user', async () => {
    signInAs('emilys')
    await renderApp('/admin/users')
    await userEvent.click(await screen.findByRole('button', { name: 'Delete Avery Perez' }))
    await userEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cancel' }),
    )
    expect(overlay().deleted).toEqual([])
  })

  it('deleting a locally created user makes no network request', async () => {
    signInAs('emilys')
    const local = overlay().create({
      username: 'shortlived',
      firstName: 'Short',
      lastName: 'Lived',
      email: 's@x.com',
      image: '',
      role: 'user',
    })
    const requests = recordRequests()
    await renderApp('/admin/users')
    await userEvent.click(await screen.findByRole('button', { name: 'Delete Short Lived' }))
    await userEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Delete' }),
    )
    expect(await screen.findByText('Short Lived was deleted.')).toBeInTheDocument()
    expect(overlay().created[local.id]).toBeUndefined()
    expect(requests.filter((r) => /^(PUT|POST|DELETE)/.test(r))).toEqual([])
  })

  it('keeps the user and reports the error when DummyJSON fails', async () => {
    signInAs('emilys')
    server.use(
      http.delete('https://dummyjson.com/users/16', () =>
        HttpResponse.json({ message: 'boom' }, { status: 500 }),
      ),
    )
    await renderApp('/admin/users')
    await userEvent.click(await screen.findByRole('button', { name: 'Delete Avery Perez' }))
    await userEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Delete' }),
    )
    expect(
      await screen.findByText('The server had a problem. Please try again.'),
    ).toBeInTheDocument()
    expect(overlay().deleted).toEqual([])
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
    await renderApp('/admin/users/1/edit')
    await screen.findByLabelText('First name')
    expect(screen.getByRole('combobox', { name: 'Role' })).toBeDisabled()
    expect(screen.getByText('You cannot delete or demote your own account.')).toBeInTheDocument()
  })

  it('the last admin cannot be deleted or demoted', async () => {
    signInAs('emilys')
    overlay().update(1, { role: 'user' }) // only michaelw is an admin now; the session is still emilys
    await renderApp('/admin/users')
    const lastAdmin = await screen.findByRole('button', { name: 'Delete Michael Williams' })
    expect(lastAdmin).toBeDisabled()
    expect(lastAdmin).toHaveAttribute('title', 'The last admin cannot be deleted or demoted.')
  })

  it('the edit form locks the role of the last admin', async () => {
    signInAs('emilys')
    overlay().update(1, { role: 'user' })
    await renderApp('/admin/users/2/edit')
    await screen.findByLabelText('First name')
    expect(screen.getByRole('combobox', { name: 'Role' })).toBeDisabled()
    expect(screen.getByText('The last admin cannot be deleted or demoted.')).toBeInTheDocument()
  })

  it('an edit that would remove the last admin is refused and no request is sent', async () => {
    signInAs('emilys')
    overlay().update(1, { role: 'user' })
    const requests = recordRequests()
    // bypass the disabled select: the mutation itself must also refuse
    const { useUpdateUser } = await import('../hooks/use-user-mutations')
    const { renderHook } = await import('@testing-library/react')
    const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query')
    const client = new QueryClient()
    const { usersQueryOptions } = await import('../queries')
    const { fixtureUserList } = await import('@/test/fixtures/users')
    client.setQueryData(usersQueryOptions.queryKey, fixtureUserList)
    const { result } = renderHook(() => useUpdateUser(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    })
    await expect(
      result.current.mutateAsync({ id: 2, patch: { role: 'user' } }),
    ).rejects.toMatchObject({
      kind: 'forbidden',
      message: 'last-admin',
    })
    expect(requests.filter((r) => r.startsWith('PUT'))).toEqual([])
    expect(overlay().patched[2]).toBeUndefined()
  })
})

describe('role edits take effect on sign-in (USER-5)', () => {
  it('a role granted in the overlay is applied when that user signs in', async () => {
    overlay().update(16, { role: 'admin' })
    await useAuthStore.getState().login('averyp', 'averyppass')
    expect(useAuthStore.getState().user?.role).toBe('admin')
  })

  it('a role removed in the overlay is applied when that user signs in', async () => {
    overlay().update(1, { role: 'user' })
    const user = await useAuthStore.getState().login('emilys', 'emilyspass')
    expect(user.role).toBe('user')
    const { router } = await renderApp('/admin')
    expect(router.state.location.pathname).toBe('/forbidden')
  })

  it('a deleted user cannot sign in', async () => {
    overlay().remove(16)
    await expect(useAuthStore.getState().login('averyp', 'averyppass')).rejects.toMatchObject({
      kind: 'unauthorized',
    })
    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().accessToken).toBeNull()
  })

  it('a restored session of a deleted user is ended', async () => {
    overlay().remove(16)
    useAuthStore.setState({ accessToken: 'access-16', refreshToken: 'refresh-16' })
    await useAuthStore.getState().bootstrap()
    expect(useAuthStore.getState().status).toBe('anonymous')
  })
})
