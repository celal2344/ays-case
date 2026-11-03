import { createFileRoute } from '@tanstack/react-router'

import { PageSkeleton } from '@/components/feedback/feedback'
import { CartPage } from '@/features/cart/components/cart-page'
import { catalogQueryOptions } from '@/features/products/queries'

export const Route = createFileRoute('/_auth/cart')({
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQueryOptions),
  pendingComponent: PageSkeleton,
  component: CartPage,
})
