import { useRouter } from '@tanstack/react-router'

import { useAuthStore } from '../store'

export function useLogout() {
  const router = useRouter()
  const logout = useAuthStore((s) => s.logout)
  return () => {
    logout()
    void router.navigate({ to: '/login' })
  }
}
