import type { RegisterInput } from '@ays/validators'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'

import { toAppError, type AppError } from '@/lib/http-error'

import { DEFAULT_LANDING } from '../context'
import type { User } from '../schemas'
import { useAuthStore } from '../store'

/** Creates the account, signs in, and goes back to where the visitor started (or home). */
export function useRegister(redirectTo: string | undefined) {
  const router = useRouter()
  const register = useAuthStore((s) => s.register)
  return useMutation<User, AppError, RegisterInput>({
    mutationFn: async (input) => {
      try {
        return await register(input)
      } catch (error) {
        throw toAppError(error)
      }
    },
    onSuccess: () => {
      router.history.push(redirectTo ?? DEFAULT_LANDING)
    },
  })
}
