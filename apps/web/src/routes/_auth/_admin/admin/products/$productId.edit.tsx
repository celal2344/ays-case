import { createFileRoute, redirect } from '@tanstack/react-router'

/** The product form is a modal on the list now; old links land there with it open. */
export const Route = createFileRoute('/_auth/_admin/admin/products/$productId/edit')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/admin/products',
      search: { edit: Number(params.productId) },
      replace: true,
    })
  },
})
