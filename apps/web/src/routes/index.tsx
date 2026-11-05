import { createFileRoute } from '@tanstack/react-router'

import { HomePage, HomeSkeleton } from '@/features/home/components/home-page'
import { catalogQueryOptions } from '@/features/products/queries'

export const Route = createFileRoute('/')({
  loader: ({ context }) => context.queryClient.query(catalogQueryOptions),
  pendingComponent: HomeSkeleton,
  component: HomePage,
})
