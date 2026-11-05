import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'

import { DEFAULT_LANDING } from '@/features/auth/context'
import { LoginPage } from '@/features/auth/components/login-page'
import { safeRedirect } from '@/lib/safe-redirect'

export const Route = createFileRoute('/login')({
  validateSearch: z.object({
    // only same-site paths: an external target would make the login page an open redirect
    redirect: z.string().optional().transform(safeRedirect).catch(undefined),
  }),
  // never waits for the session: the page itself redirects once it knows the user is signed in
  beforeLoad: ({ context, search }) => {
    if (context.auth.getState().status === 'authenticated') {
      throw redirect({ href: search.redirect ?? DEFAULT_LANDING })
    }
  },
  component: LoginPage,
})
