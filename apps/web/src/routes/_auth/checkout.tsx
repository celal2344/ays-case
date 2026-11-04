import { createFileRoute, redirect } from '@tanstack/react-router'

import { PageSkeleton } from '@/components/feedback/feedback'
import { cartQueryOptions } from '@/features/cart/queries'
import { CheckoutPage } from '@/features/orders/components/checkout-page'
import { catalogQueryOptions } from '@/features/products/queries'

export const Route = createFileRoute('/_auth/checkout')({
  beforeLoad: async ({ context }) => {
    const lines = await context.queryClient.ensureQueryData(cartQueryOptions)
    if (lines.length === 0) throw redirect({ to: '/cart' })
  },
  loader: ({ context }) => context.queryClient.query(catalogQueryOptions),
  pendingComponent: PageSkeleton,
  component: CheckoutPage,
})
