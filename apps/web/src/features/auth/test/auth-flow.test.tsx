import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { serverSession } from '@/test/msw/handlers'
import { renderApp } from '@/test/render'
import { only, recordRequests } from '@/test/requests'

import { setSessionExpiredHandler, useAuthStore } from '../store'

const pathname = (router: { state: { location: { pathname: string } } }) =>
  router.state.location.pathname

function signInAs(role: 'admin' | 'user') {
  serverSession.userId = role === 'admin' ? 'user-1' : 'user-16'
}

describe('auth flow (AUTH-1..7)', () => {
  it('AUTH-4: logged-out visit to a protected page redirects to /login with the target', async () => {
    const { router } = await renderApp('/orders')
    expect(pathname(router)).toBe('/login')
    expect(router.state.location.search).toEqual({ redirect: '/orders' })
  })

  it('AUTH-1/3: filling the demo admin and submitting lands on the redirect target', async () => {
    const { router } = await renderApp('/login?redirect=%2Forders')
    await userEvent.click(screen.getByRole('button', { name: 'Fill admin' }))
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(pathname(router)).toBe('/orders'))
    expect(useAuthStore.getState().user?.role).toBe('admin')
  })

  it('an external ?redirect= is dropped: signing in lands on the default page', async () => {
    const { router } = await renderApp('/login?redirect=%2F%2Fevil.com')
    expect(router.state.location.search).toEqual({})
    await userEvent.click(screen.getByRole('button', { name: 'Fill user' }))
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(pathname(router)).toBe('/products'))
  })

  it('an already signed-in visitor with an external ?redirect= is sent to the default page', async () => {
    signInAs('user')
    const { router } = await renderApp('/login?redirect=https%3A%2F%2Fevil.com')
    await waitFor(() => expect(pathname(router)).toBe('/products'))
  })

  it('a malformed ?redirect= is ignored instead of crashing the page', async () => {
    const { router } = await renderApp('/login?redirect=123')
    expect(pathname(router)).toBe('/login')
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('AUTH-1: shows the server error for invalid credentials', async () => {
    await renderApp('/login')
    await userEvent.type(screen.getByLabelText('Username'), 'emilys')
    await userEvent.type(screen.getByLabelText('Password'), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid username or password')
  })

  it('AUTH-1: validates required fields before calling the API', async () => {
    await renderApp('/login')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findAllByText('This field is required')).toHaveLength(2)
  })

  it('AUTH-6: a session cookie survives a reload, and /login sends the user away', async () => {
    signInAs('user')
    const { router } = await renderApp('/login')
    expect(pathname(router)).toBe('/products')
    expect(useAuthStore.getState().user?.username).toBe('averyp')
  })

  it('AUTH-6: a session the server rejects mid-visit sends the user back to /login', async () => {
    signInAs('admin')
    const { router } = await renderApp('/orders')
    expect(pathname(router)).toBe('/orders')
    setSessionExpiredHandler(() => void router.navigate({ to: '/login' }))
    serverSession.userId = null // the cookie expired
    await router.navigate({ to: '/admin/users' })
    await waitFor(() => expect(pathname(router)).toBe('/login'))
    expect(useAuthStore.getState().status).toBe('anonymous')
    setSessionExpiredHandler(null)
  })

  it('AUTH-7: a normal user on /admin is sent to /forbidden', async () => {
    signInAs('user')
    const { router } = await renderApp('/admin')
    expect(pathname(router)).toBe('/forbidden')
    expect(screen.getByText('Admins only')).toBeInTheDocument()
  })

  it('AUTH-7: an admin reaches /admin and sees the Admin nav item', async () => {
    signInAs('admin')
    const { router } = await renderApp('/admin')
    expect(pathname(router)).toBe('/admin')
    expect(await screen.findByRole('heading', { name: 'Admin' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Admin/ })).toBeInTheDocument()
  })

  it('AUTH-5: logout clears the session and returns to /login', async () => {
    signInAs('admin')
    const { router } = await renderApp('/orders')
    await userEvent.click(screen.getByRole('button', { name: 'Emily Johnson' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Log out' }))
    await waitFor(() => expect(pathname(router)).toBe('/login'))
    expect(useAuthStore.getState()).toMatchObject({ user: null, status: 'anonymous' })
  })

  it('a double click on Log out sends one sign-out request', async () => {
    signInAs('admin')
    const requests = recordRequests()
    const { router } = await renderApp('/orders')
    await userEvent.click(screen.getByRole('button', { name: 'Emily Johnson' }))
    const item = await screen.findByRole('menuitem', { name: 'Log out' })
    fireEvent.click(item)
    fireEvent.click(item)
    await waitFor(() => expect(pathname(router)).toBe('/login'))
    expect(only(requests, 'POST /api/auth/sign-out')).toHaveLength(1)
  })
})
