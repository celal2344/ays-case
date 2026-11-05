import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { signInAs } from '@/test/auth'
import { admin, serverSession } from '@/test/msw/handlers'
import { renderApp } from '@/test/render'

import { useAuthStore } from '../store'

const pathname = (router: { state: { location: { pathname: string } } }) =>
  router.state.location.pathname

async function fillRegister(values: Partial<Record<string, string>> = {}) {
  const all = {
    'First name': 'Celal',
    'Last name': 'Özdemir',
    Username: 'celal',
    Email: 'celal@example.test',
    Password: 'a-long-password',
    'Confirm password': 'a-long-password',
    ...values,
  }
  for (const [label, value] of Object.entries(all)) {
    await userEvent.type(screen.getByLabelText(label, { selector: 'input' }), value ?? '')
  }
}

const submit = () => userEvent.click(screen.getByRole('button', { name: 'Create account' }))

describe('registration', () => {
  it('creates the account, signs the user in and goes home', async () => {
    const { router } = await renderApp('/register')
    await fillRegister()
    await submit()
    await waitFor(() => expect(pathname(router)).toBe('/products'))
    expect(useAuthStore.getState().user).toMatchObject({ username: 'celal', role: 'user' })
    expect(admin.users.some((u) => u.username === 'celal')).toBe(true)
  })

  it('goes back to the redirect target, and ignores an external one', async () => {
    const { router } = await renderApp('/register?redirect=%2Fcart')
    await fillRegister()
    await submit()
    await waitFor(() => expect(pathname(router)).toBe('/cart'))
  })

  it('puts a taken username on the username field, and a taken email on the email field', async () => {
    await renderApp('/register')
    await fillRegister({ Username: 'emilys' })
    await submit()
    const username = await screen.findByLabelText('Username', { selector: 'input' })
    await waitFor(() => expect(username).toHaveAttribute('aria-invalid', 'true'))
    expect(await screen.findByText('This username is taken.')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).not.toHaveAttribute('aria-invalid', 'true')

    await userEvent.clear(username)
    await userEvent.type(username, 'someone_new')
    await userEvent.clear(screen.getByLabelText('Email'))
    await userEvent.type(screen.getByLabelText('Email'), 'emilys@example.com')
    await submit()
    expect(
      await screen.findByText('An account with this email already exists.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
    expect(username).not.toHaveAttribute('aria-invalid', 'true')
  })

  it('explains what to fix next to each field and creates nothing', async () => {
    await renderApp('/register')
    await fillRegister({ Username: 'x', 'Confirm password': 'different-password' })
    await submit()
    expect(
      await screen.findByText('3 to 30 characters: letters, numbers, _ and .'),
    ).toBeInTheDocument()
    expect(screen.getByText('The passwords do not match.')).toBeInTheDocument()
    expect(screen.getByLabelText('Username')).toHaveAttribute('aria-describedby')
    expect(admin.users.some((u) => u.firstName === 'Celal')).toBe(false)
  })

  it('a signed-in user cannot open /register', async () => {
    signInAs('averyp')
    const { router } = await renderApp('/register')
    await waitFor(() => expect(pathname(router)).toBe('/products'))
  })

  it('shows "Sign up" in the header of the shop for visitors only', async () => {
    const view = await renderApp('/products')
    expect(await screen.findByRole('link', { name: 'Sign up' })).toHaveAttribute(
      'href',
      '/register',
    )
    view.unmount()
    serverSession.userId = null
    signInAs('averyp')
    await renderApp('/products')
    await screen.findByRole('button', { name: 'Avery Perez' })
    expect(screen.queryByRole('link', { name: 'Sign up' })).toBeNull()
  })
})

describe('sign-in with a username or an email', () => {
  it('signs in with the username', async () => {
    const { router } = await renderApp('/login')
    await userEvent.type(screen.getByLabelText('Username or email'), 'averyp')
    await userEvent.type(screen.getByLabelText('Password', { selector: 'input' }), 'averyppass')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(pathname(router)).toBe('/products'))
    expect(useAuthStore.getState().user?.username).toBe('averyp')
  })

  it('signs in with the email', async () => {
    const { router } = await renderApp('/login')
    await userEvent.type(screen.getByLabelText('Username or email'), 'averyp@example.com')
    await userEvent.type(screen.getByLabelText('Password', { selector: 'input' }), 'averyppass')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(pathname(router)).toBe('/products'))
    expect(useAuthStore.getState().user?.username).toBe('averyp')
  })

  it('the demo buttons only fill the form: the user signs in themselves', async () => {
    await renderApp('/login')
    await userEvent.click(screen.getByRole('button', { name: 'Admin' }))
    expect(screen.getByLabelText('Username or email')).toHaveValue('emilys')
    expect(useAuthStore.getState().user).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(useAuthStore.getState().user?.role).toBe('admin'))
  })

  it('the password can be shown and hidden', async () => {
    await renderApp('/login')
    const password = screen.getByLabelText('Password', { selector: 'input' })
    expect(password).toHaveAttribute('type', 'password')
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }))
    expect(password).toHaveAttribute('type', 'text')
    await userEvent.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(password).toHaveAttribute('type', 'password')
  })
})

describe('a pending action after registering', () => {
  it('signed out: Add to cart goes to login; registering applies the action', async () => {
    const { router } = await renderApp('/products/2')
    await userEvent.click((await screen.findAllByRole('button', { name: 'Add to cart' }))[0]!)
    await waitFor(() => expect(pathname(router)).toBe('/login'))
    await userEvent.click(await screen.findByRole('link', { name: 'Sign up' }))
    await waitFor(() => expect(pathname(router)).toBe('/register'))
    expect(router.state.location.search).toEqual({ redirect: '/products/2' })

    await fillRegister()
    await submit()
    await waitFor(() => expect(pathname(router)).toBe('/products/2'))
    await waitFor(() => expect(useAuthStore.getState().user?.username).toBe('celal'))
    await waitFor(() => expect(sessionStorage.getItem('ays-case:v1:pending-action')).toBeNull())
  })
})
