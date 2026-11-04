import { createFileRoute, redirect } from '@tanstack/react-router'

/** The user form is a dialog on the list now; old links land there with it open. */
export const Route = createFileRoute('/_auth/_admin/admin/users/new')({
  beforeLoad: () => {
    throw redirect({ to: '/admin/users', search: { new: 1 }, replace: true })
  },
})
