import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'

import '@/i18n'
import { useAuthStore } from '@/features/auth/store'
import { usePreferencesStore } from '@/preferences/store'

import { server } from './msw/server'

// jsdom has no matchMedia; next-themes reads it to resolve the "system" theme.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }),
})

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterAll(() => server.close())

beforeEach(() => {
  usePreferencesStore.setState({ language: 'en', shopView: 'grid' })
  useAuthStore.setState({ accessToken: null, refreshToken: null, user: null, status: 'idle' })
})

afterEach(() => {
  cleanup()
  server.resetHandlers()
  localStorage.clear()
  sessionStorage.clear()
})
