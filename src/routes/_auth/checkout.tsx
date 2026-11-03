import { createFileRoute, redirect } from '@tanstack/react-router'

import { PageSkeleton } from '@/components/feedback/feedback'
import { useCartStore } from '@/features/cart/store'
import { CheckoutPage } from '@/features/orders/components/checkout-page'
import { catalogQueryOptions } from '@/features/products/queries'

export const Route = createFileRoute('/_auth/checkout')({
  beforeLoad: ({ context }) => {
    const userId = context.auth.getState().user?.id
    const lines = userId === undefined ? [] : (useCartStore.getState().byUser[userId] ?? [])
    if (lines.length === 0) throw redirect({ to: '/cart' })
  },
  loader: ({ context }) => context.queryClient.query(catalogQueryOptions),
  pendingComponent: PageSkeleton,
  component: CheckoutPage,
})
