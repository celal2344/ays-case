import { createFileRoute } from '@tanstack/react-router'

import { PageSkeleton } from '@/components/feedback/feedback'
import { DashboardPage } from '@/features/admin/components/dashboard-page'
import { catalogQueryOptions } from '@/features/products/queries'
import { usersQueryOptions } from '@/features/users/queries'

export const Route = createFileRoute('/_auth/_admin/admin/')({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(catalogQueryOptions),
      context.queryClient.ensureQueryData(usersQueryOptions),
    ]),
  pendingComponent: PageSkeleton,
  component: DashboardPage,
})
