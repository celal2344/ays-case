import { createFileRoute } from '@tanstack/react-router'

import { ProductGridSkeleton } from '@/features/products/components/product-grid'
import { ProductsPage } from '@/features/products/components/products-page'
import { catalogQueryOptions, categoriesQueryOptions } from '@/features/products/queries'
import { productSearchSchema } from '@/features/products/schemas'

export const Route = createFileRoute('/products/')({
  validateSearch: productSearchSchema,
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.query(catalogQueryOptions),
      context.queryClient.query(categoriesQueryOptions),
    ]),
  pendingComponent: ProductGridSkeleton,
  component: ProductsPage,
})
