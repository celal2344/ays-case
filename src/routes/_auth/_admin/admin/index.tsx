import { createFileRoute } from '@tanstack/react-router'

import { PageSkeleton } from '@/components/feedback/feedback'
import { DashboardPage } from '@/features/admin/components/dashboard-page'
import { catalogQueryOptions } from '@/features/products/queries'

export const Route = createFileRoute('/_auth/_admin/admin/')({
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQueryOptions),
  pendingComponent: PageSkeleton,
  component: DashboardPage,
})
