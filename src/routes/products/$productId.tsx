import { createFileRoute, notFound } from '@tanstack/react-router'

import { PageSkeleton } from '@/components/feedback/feedback'
import { ProductDetailPage } from '@/features/products/components/product-detail-page'
import { isLocal } from '@/features/products/overlay-store'
import { productDetailQueryOptions } from '@/features/products/queries'

export const Route = createFileRoute('/products/$productId')({
  loader: async ({ context, params }) => {
    const id = Number(params.productId)
    if (!Number.isInteger(id) || id < 1) throw notFound()
    // A failed fetch (e.g. 404) is rendered by the page itself, so the loader never blocks on it.
    if (!isLocal(id)) {
      await context.queryClient.query(productDetailQueryOptions(id)).catch(() => undefined)
    }
  },
  pendingComponent: PageSkeleton,
  component: ProductDetailPage,
})
