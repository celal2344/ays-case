import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useAuthStore } from '@/features/auth/store'
import { renderApp } from '@/test/render'

describe('header while the session is being checked', () => {
  it('renders the header and a user-area skeleton before get-session resolves', async () => {
    useAuthStore.setState({ user: null, status: 'restoring' })
    await renderApp('/')
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByTestId('user-menu-skeleton')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Giriş yap' })).toBeNull()
  })
})
