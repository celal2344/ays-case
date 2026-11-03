import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'

import { DEFAULT_LANDING } from '@/features/auth/context'
import { LoginPage } from '@/features/auth/components/login-page'

export const Route = createFileRoute('/login')({
  validateSearch: z.object({ redirect: z.string().optional() }),
  beforeLoad: async ({ context, search }) => {
    await context.auth.bootstrap()
    if (context.auth.getState().status === 'authenticated') {
      throw redirect({ href: search.redirect ?? DEFAULT_LANDING })
    }
  },
  component: LoginPage,
})
