import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { queryClient } from '@/lib/query-client'
import { storageKey } from '@/lib/storage'

import { getMe, loginRequest } from './api'
import type { Tokens, User } from './schemas'

export type AuthStatus = 'idle' | 'restoring' | 'authenticated' | 'anonymous'

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: User | null
  status: AuthStatus
  bootstrap: () => Promise<void>
  login: (username: string, password: string) => Promise<User>
  logout: () => void
  setTokens: (tokens: Tokens) => void
}

let restoring: Promise<void> | null = null

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      status: 'idle',

      // Idempotent: every caller (guards, tests) shares one restore promise.
      bootstrap: () => {
        if (restoring) return restoring
        if (get().status !== 'idle') return Promise.resolve()
        const { accessToken, refreshToken } = get()
        if (!accessToken || !refreshToken) {
          set({ status: 'anonymous' })
          return Promise.resolve()
        }
        set({ status: 'restoring' })
        const attempt = getMe()
          .then(
            (user) => {
              set({ user, status: 'authenticated' })
            },
            () => {
              get().logout()
            },
          )
          .finally(() => {
            restoring = null
          })
        restoring = attempt
        return attempt
      },

      login: async (username, password) => {
        const { accessToken, refreshToken } = await loginRequest(username, password)
        set({ accessToken, refreshToken })
        try {
          const user = await getMe()
          set({ user, status: 'authenticated' })
          return user
        } catch (error) {
          set({ accessToken: null, refreshToken: null, user: null, status: 'anonymous' })
          throw error
        }
      },

      logout: () => {
        set({ accessToken: null, refreshToken: null, user: null, status: 'anonymous' })
        queryClient.clear()
      },

      setTokens: ({ accessToken, refreshToken }) => set({ accessToken, refreshToken }),
    }),
    {
      name: storageKey('auth'),
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ accessToken, refreshToken, user }) => ({ accessToken, refreshToken, user }),
    },
  ),
)

export const selectUser = (s: AuthState) => s.user
export const selectIsAuthenticated = (s: AuthState) => s.status === 'authenticated'
export const selectIsAdmin = (s: AuthState) => s.user?.role === 'admin'
