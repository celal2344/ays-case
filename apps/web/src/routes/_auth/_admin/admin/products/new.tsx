import { createFileRoute, redirect } from '@tanstack/react-router'

/** The product form is a modal on the list now; old links land there with it open. */
export const Route = createFileRoute('/_auth/_admin/admin/products/new')({
  beforeLoad: () => {
    throw redirect({ to: '/admin/products', search: { new: 1 }, replace: true })
  },
})
