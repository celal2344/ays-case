import { toast } from 'sonner'
import { create } from 'zustand'

import i18next from 'i18next'
import { authClient } from '@/lib/auth-client'
import { AppError, toAppError } from '@/lib/http-error'
import { queryClient } from '@/lib/query-client'

import type { RegisterInput } from '@ays/validators'

import { sessionUserSchema, type User } from './schemas'

export type AuthStatus = 'idle' | 'restoring' | 'authenticated' | 'anonymous'

interface AuthState {
  user: User | null
  status: AuthStatus
  bootstrap: () => Promise<void>
  /** A value with an `@` is an email, anything else a username. */
  login: (identifier: string, password: string) => Promise<User>
  register: (input: RegisterInput) => Promise<User>
  logout: () => void
  /** Re-reads the signed-in user (after an admin edits their own account). */
  refresh: () => Promise<void>
  /** The server rejected the session (expired or revoked) while the user was signed in. */
  expire: () => void
}

let restoring: Promise<void> | null = null
let onExpired: (() => void) | null = null

/** The app shell registers where to send the user once their session is gone. */
export function setSessionExpiredHandler(handler: (() => void) | null) {
  onExpired = handler
}

/** The session user comes straight from the server, role included. */
async function readSession(): Promise<User | null> {
  const { data } = await authClient.getSession()
  if (!data) return null
  const parsed = sessionUserSchema.safeParse(data.user)
  return parsed.success ? parsed.data : null
}

/** A Better Auth error as an AppError that keeps its code, so a page can tell which field it is about. */
function authError(error: { status: number; message?: string; code?: string }, fallback: string) {
  if (error.status === 429) {
    return new AppError('server', error.message ?? fallback, 429, 'rate_limited')
  }
  const kind =
    error.status === 401 || error.status === 400 || error.status === 422 ? 'validation' : 'server'
  return new AppError(kind, error.message ?? fallback, error.status, error.code)
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  status: 'idle',

  // Idempotent: every caller (guards, tests) shares one restore promise.
  bootstrap: () => {
    if (restoring) return restoring
    if (get().status !== 'idle') return Promise.resolve()
    set({ status: 'restoring' })
    const attempt = readSession()
      .then(
        (user) => {
          if (user) set({ user, status: 'authenticated' })
          else set({ user: null, status: 'anonymous' })
        },
        () => {
          set({ user: null, status: 'anonymous' })
        },
      )
      .finally(() => {
        restoring = null
      })
    restoring = attempt
    return attempt
  },

  login: async (identifier, password) => {
    let result
    try {
      result = identifier.includes('@')
        ? await authClient.signIn.email({ email: identifier, password })
        : await authClient.signIn.username({ username: identifier, password })
    } catch (error) {
      throw toAppError(error)
    }
    if (result.error) throw authError(result.error, 'Sign-in failed')
    const user = await readSession().catch(() => null)
    if (!user) {
      await authClient.signOut().catch(() => undefined)
      throw new AppError('unauthorized', 'This account was removed by an administrator.')
    }
    set({ user, status: 'authenticated' })
    return user
  },

  register: async (input) => {
    let result
    try {
      result = await authClient.signUp.email({
        email: input.email,
        password: input.password,
        name: `${input.firstName} ${input.lastName}`,
        firstName: input.firstName,
        lastName: input.lastName,
        username: input.username,
        displayUsername: input.username,
      })
    } catch (error) {
      throw toAppError(error)
    }
    if (result.error) throw authError(result.error, 'Sign-up failed')
    const user = await readSession().catch(() => null)
    if (!user) throw new AppError('server', 'The account was created, but signing in failed.')
    set({ user, status: 'authenticated' })
    return user
  },

  refresh: async () => {
    const user = await readSession().catch(() => null)
    if (user) set({ user })
  },

  logout: () => {
    set({ user: null, status: 'anonymous' })
    queryClient.clear()
    void authClient.signOut().catch(() => undefined)
  },

  expire: () => {
    if (get().status !== 'authenticated') return
    set({ user: null, status: 'anonymous' })
    queryClient.clear()
    toast.error(i18next.t('errors.unauthorized'))
    onExpired?.()
  },
}))

export const selectUser = (s: AuthState) => s.user
export const selectIsAuthenticated = (s: AuthState) => s.status === 'authenticated'
export const selectIsAdmin = (s: AuthState) => s.user?.role === 'admin'
