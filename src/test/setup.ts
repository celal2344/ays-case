import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest'

import '@/i18n'
import { useAuthStore } from '@/features/auth/store'
import { useCartStore } from '@/features/cart/store'
import { useFavoritesStore } from '@/features/favorites/store'
import { useRecentlyViewedStore } from '@/features/recently-viewed/store'
import { useOrdersStore } from '@/features/orders/store'
import { useUserOverlayStore } from '@/features/users/overlay-store'
import { useReviewsStore } from '@/features/reviews/store'
import { useProductOverlayStore } from '@/features/products/overlay-store'
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

// jsdom has no layout observers; the carousel (embla) and the sticky bar use them.
class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}
Element.prototype.scrollIntoView = () => {}
vi.stubGlobal('ResizeObserver', NoopObserver)
vi.stubGlobal('IntersectionObserver', NoopObserver)

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterAll(() => server.close())

beforeEach(() => {
  usePreferencesStore.setState({ language: 'en', shopView: 'grid' })
  useAuthStore.setState({ accessToken: null, refreshToken: null, user: null, status: 'idle' })
  useProductOverlayStore.getState().reset()
  useReviewsStore.getState().reset()
  useUserOverlayStore.getState().reset()
  useCartStore.setState({ byUser: {} })
  useFavoritesStore.setState({ byUser: {} })
  useRecentlyViewedStore.setState({ byUser: {} })
  useOrdersStore.setState({ orders: [] })
})

afterEach(() => {
  cleanup()
  server.resetHandlers()
  localStorage.clear()
  sessionStorage.clear()
})
