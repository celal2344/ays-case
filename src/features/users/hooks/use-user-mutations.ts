import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'

import { useAuthStore } from '@/features/auth/store'
import { useCartStore } from '@/features/cart/store'
import { toAppError, AppError } from '@/lib/http-error'

import { createUser, deleteUser, updateUser } from '../api'
import { applyUserOverlay, isUsernameTaken } from '../catalog'
import { demoteGuard, deleteGuard, type GuardReason } from '../guardrails'
import { isLocalUser, useUserOverlayStore, type UserInput, type UserPatch } from '../overlay-store'
import { usersQueryOptions } from '../queries'
import type { User } from '../schemas'
import { resolveSessionUser } from '../session'

// DummyJSON persists nothing, so every write also goes to the overlay, and only after the request
// succeeds. The guardrails run first: a refused action sends no request at all.

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
function syncSession(id: number) {
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
      try {
        await createUser(input)
      } catch (error) {
        throw toAppError(error)
      }
      return useUserOverlayStore.getState().create(input)
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation<void, AppError, { id: number; patch: UserPatch }>({
    mutationFn: async ({ id, patch }) => {
      const users = mergedUsers(queryClient)
      if (patch.username && isUsernameTaken(users, patch.username, id)) {
        throw new AppError('validation', 'admin.users.form.errors.usernameTaken')
      }
      if (patch.role) {
        const reason = demoteGuard(users, id, patch.role, currentUserId())
        if (reason) throw new GuardrailError(reason)
      }
      if (!isLocalUser(id)) {
        try {
          await updateUser(id, patch)
        } catch (error) {
          throw toAppError(error)
        }
      }
      useUserOverlayStore.getState().update(id, patch)
      syncSession(id)
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation<void, AppError, number>({
    mutationFn: async (id) => {
      const reason = deleteGuard(mergedUsers(queryClient), id, currentUserId())
      if (reason) throw new GuardrailError(reason)
      if (!isLocalUser(id)) {
        try {
          await deleteUser(id)
        } catch (error) {
          throw toAppError(error)
        }
      }
      useUserOverlayStore.getState().remove(id)
      useCartStore.getState().clear(id) // their cart goes; their past orders stay as history
    },
  })
}
