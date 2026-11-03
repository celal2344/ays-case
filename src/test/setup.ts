import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'

import '@/i18n'
import { usePreferencesStore } from '@/preferences/store'

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

beforeEach(() => {
  usePreferencesStore.setState({ language: 'en', shopView: 'grid' })
})

afterEach(() => {
  cleanup()
  localStorage.clear()
})
