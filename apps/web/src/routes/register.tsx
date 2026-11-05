import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'

import { RegisterPage } from '@/features/auth/components/register-page'
import { DEFAULT_LANDING } from '@/features/auth/context'
import { safeRedirect } from '@/lib/safe-redirect'

export const Route = createFileRoute('/register')({
  validateSearch: z.object({
    // only same-site paths: an external target would make the page an open redirect
    redirect: z.string().optional().transform(safeRedirect).catch(undefined),
  }),
  // never waits for the session: the page itself leaves once it knows the user is signed in
  beforeLoad: ({ context, search }) => {
    if (context.auth.getState().status === 'authenticated') {
      throw redirect({ href: search.redirect ?? DEFAULT_LANDING })
    }
  },
  component: RegisterPage,
})
