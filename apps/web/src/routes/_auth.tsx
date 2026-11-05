import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

import { PageSkeleton } from '@/components/feedback/feedback'

export const Route = createFileRoute('/_auth')({
  beforeLoad: async ({ context, location }) => {
    await context.auth.bootstrap()
    if (context.auth.getState().status !== 'authenticated') {
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }
  },
  pendingComponent: PageSkeleton,
  component: Outlet,
})
