import { useMutation } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'

import { toAppError, type AppError } from '@/lib/http-error'

import { DEFAULT_LANDING } from '../context'
import type { LoginFormValues, User } from '../schemas'
import { useAuthStore } from '../store'

export function useLogin(redirectTo: string | undefined) {
  const router = useRouter()
  const login = useAuthStore((s) => s.login)
  return useMutation<User, AppError, LoginFormValues>({
    mutationFn: async ({ identifier, password }: LoginFormValues) => {
      try {
        return await login(identifier, password)
      } catch (error) {
        throw toAppError(error)
      }
    },
    onSuccess: () => {
      router.history.push(redirectTo ?? DEFAULT_LANDING)
    },
  })
}
