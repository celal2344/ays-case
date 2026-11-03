import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/_admin')({
  beforeLoad: ({ context }) => {
    if (context.auth.getState().user?.role !== 'admin') throw redirect({ to: '/forbidden' })
  },
  component: Outlet,
})
