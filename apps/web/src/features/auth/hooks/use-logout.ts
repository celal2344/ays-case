import { useRouter } from '@tanstack/react-router'

import { runExclusive } from '@/lib/in-flight'

import { useAuthStore } from '../store'

/** Signs out once, however many times it is clicked. */
export function useLogout() {
  const router = useRouter()
  const logout = useAuthStore((s) => s.logout)
  return () =>
    void runExclusive('auth:logout', async () => {
      logout()
      await router.navigate({ to: '/login' })
    })
}
