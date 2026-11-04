import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'

import { useAuthStore } from '@/features/auth/store'
import { useCartStore } from '@/features/cart/store'
import { AppError } from '@/lib/http-error'

import { applyUserOverlay, isUsernameTaken } from '../catalog'
import { demoteGuard, deleteGuard, type GuardReason } from '../guardrails'
import { useUserOverlayStore, type UserInput, type UserPatch } from '../overlay-store'
import { usersQueryOptions } from '../queries'
import type { User } from '../schemas'
import { resolveSessionUser } from '../session'

// The API has no user writes yet, so admin edits live in the browser overlay only. The guardrails
// run first: a refused action changes nothing.

/** Thrown for a refused action; `message` is the reason code the UI translates. */
export class GuardrailError extends AppError {
  readonly reason: GuardReason
  constructor(reason: GuardReason) {
    super('forbidden', reason)
    this.reason = reason
  }
}

function mergedUsers(queryClient: QueryClient): User[] {
  const remote = queryClient.getQueryData(usersQueryOptions.queryKey) ?? []
  const { created, patched, deleted } = useUserOverlayStore.getState()
  return applyUserOverlay(remote, { created, patched, deleted })
}

export const currentUserId = () => useAuthStore.getState().user?.id

/** Keeps the signed-in user's header/menu in step with edits made to their own account. */
function syncSession(id: string) {
  const { user } = useAuthStore.getState()
  if (user?.id !== id) return
  const merged = resolveSessionUser(user)
  if (merged) useAuthStore.setState({ user: merged })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation<User, AppError, UserInput>({
    mutationFn: async (input) => {
      if (isUsernameTaken(mergedUsers(queryClient), input.username)) {
        throw new AppError('validation', 'admin.users.form.errors.usernameTaken')
      }
      return useUserOverlayStore.getState().create(input)
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation<void, AppError, { id: string; patch: UserPatch }>({
    mutationFn: async ({ id, patch }) => {
      const users = mergedUsers(queryClient)
      if (patch.username && isUsernameTaken(users, patch.username, id)) {
        throw new AppError('validation', 'admin.users.form.errors.usernameTaken')
      }
      if (patch.role) {
        const reason = demoteGuard(users, id, patch.role, currentUserId())
        if (reason) throw new GuardrailError(reason)
      }
      useUserOverlayStore.getState().update(id, patch)
      syncSession(id)
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation<void, AppError, string>({
    mutationFn: async (id) => {
      const reason = deleteGuard(mergedUsers(queryClient), id, currentUserId())
      if (reason) throw new GuardrailError(reason)
      useUserOverlayStore.getState().remove(id)
      useCartStore.getState().clear(id) // their cart goes; their past orders stay as history
    },
  })
}
