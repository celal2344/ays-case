import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { renderApp } from '@/test/render'

import { useAuthStore } from './store'

const pathname = (router: { state: { location: { pathname: string } } }) =>
  router.state.location.pathname

function signInAs(role: 'admin' | 'user') {
  useAuthStore.setState(
    role === 'admin'
      ? { accessToken: 'access-1', refreshToken: 'refresh-1' }
      : { accessToken: 'access-16', refreshToken: 'refresh-16' },
  )
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

  it('AUTH-1: shows the DummyJSON error for invalid credentials', async () => {
    await renderApp('/login')
    await userEvent.type(screen.getByLabelText('Username'), 'emilys')
    await userEvent.type(screen.getByLabelText('Password'), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials')
  })

  it('AUTH-1: validates required fields before calling the API', async () => {
    await renderApp('/login')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findAllByText('This field is required')).toHaveLength(2)
  })

  it('AUTH-6: a persisted session survives a reload, and /login sends the user away', async () => {
    signInAs('user')
    const { router } = await renderApp('/login')
    expect(pathname(router)).toBe('/')
    expect(useAuthStore.getState().user?.username).toBe('averyp')
  })

  it('AUTH-6: an expired access token is refreshed during bootstrap', async () => {
    useAuthStore.setState({ accessToken: 'access-16-expired', refreshToken: 'refresh-16' })
    const { router } = await renderApp('/orders')
    expect(pathname(router)).toBe('/orders')
    expect(useAuthStore.getState().accessToken).toBe('access-16')
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
    expect(screen.getByRole('heading', { name: 'Admin' })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Admin' }).length).toBeGreaterThan(0)
  })

  it('AUTH-5: logout clears the session and returns to /login', async () => {
    signInAs('admin')
    const { router } = await renderApp('/orders')
    await userEvent.click(screen.getByRole('button', { name: 'Emily Johnson' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Log out' }))
    await waitFor(() => expect(pathname(router)).toBe('/login'))
    expect(useAuthStore.getState()).toMatchObject({ accessToken: null, user: null })
  })
})
