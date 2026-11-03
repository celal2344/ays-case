import { createFileRoute } from '@tanstack/react-router'

import { PageSkeleton } from '@/components/feedback/feedback'
import { NewProductPage } from '@/features/admin/components/product-form-pages'
import { catalogQueryOptions, categoriesQueryOptions } from '@/features/products/queries'

export const Route = createFileRoute('/_auth/_admin/admin/products/new')({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(catalogQueryOptions),
      context.queryClient.ensureQueryData(categoriesQueryOptions),
    ]),
  pendingComponent: PageSkeleton,
  component: NewProductPage,
})
