import { createFileRoute } from '@tanstack/react-router'

import { PageSkeleton } from '@/components/feedback/feedback'
import { AdminProductsPage } from '@/features/admin/components/admin-products-page'
import { adminProductSearchSchema } from '@/features/admin/schemas'
import { catalogQueryOptions, categoriesQueryOptions } from '@/features/products/queries'

export const Route = createFileRoute('/_auth/_admin/admin/products/')({
  validateSearch: adminProductSearchSchema,
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.query(catalogQueryOptions),
      context.queryClient.query(categoriesQueryOptions),
    ]),
  pendingComponent: PageSkeleton,
  component: AdminProductsPage,
})
