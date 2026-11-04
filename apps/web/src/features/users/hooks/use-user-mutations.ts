import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { UserCreateBody, UserPatchBody } from '@ays/validators'

import type { AppError } from '@/lib/http-error'

import { createUser, deleteUser, updateUser } from '../api'
import { userKeys } from '../queries'
import type { User } from '../schemas'

// The server owns the rules (no deleting or demoting yourself, never the last admin, unique
// username and email); these hooks only call it and refetch the list.
function useRefresh() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: userKeys.all })
}

export function useCreateUser() {
  const refresh = useRefresh()
  return useMutation<User, AppError, UserCreateBody>({ mutationFn: createUser, onSettled: refresh })
}

export function useUpdateUser() {
  const refresh = useRefresh()
  return useMutation<User, AppError, { id: string; patch: UserPatchBody }>({
    mutationFn: ({ id, patch }) => updateUser(id, patch),
    onSettled: refresh,
  })
}

export function useDeleteUser() {
  const refresh = useRefresh()
  return useMutation<void, AppError, string>({ mutationFn: deleteUser, onSettled: refresh })
}
