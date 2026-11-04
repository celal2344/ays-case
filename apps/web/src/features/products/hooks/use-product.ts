import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { toAppError } from '@/lib/http-error'

import { patchProduct } from '../catalog'
import { isLocal, useProductOverlayStore } from '../overlay-store'
import { productDetailQueryOptions } from '../queries'
import type { Product, ProductDetail } from '../schemas'

/** A locally created product has no remote record: the detail-only fields are empty. */
function toLocalDetail(product: Product): ProductDetail {
  return {
    ...product,
    sku: '',
    barcode: null,
    images: [],
    weightG: null,
    widthMm: null,
    heightMm: null,
    depthMm: null,
    warranty: null,
    shipping: null,
    returnPolicy: null,
    ratingHistogram: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
    reviews: [],
  }
}

/**
 * One product for the detail page: remote detail (images, reviews, specs) with the admin patch on top.
 * Locally created products have no remote record, so they come straight from the overlay.
 */
export function useProduct(id: number) {
  const local = isLocal(id)
  const query = useQuery({ ...productDetailQueryOptions(id), enabled: !local })
  const created = useProductOverlayStore((s) => s.created[id])
  const patch = useProductOverlayStore((s) => s.patched[id])
  const deleted = useProductOverlayStore((s) => s.deleted.includes(id))

  const product = useMemo<ProductDetail | undefined>(() => {
    if (deleted) return undefined
    if (local) return created ? toLocalDetail(created) : undefined
    return query.data ? patchProduct(query.data, patch) : undefined
  }, [deleted, local, created, query.data, patch])

  const notFound =
    deleted || (local ? !created : query.isError && toAppError(query.error).kind === 'not_found')

  return { product, notFound, isPending: !local && query.isPending && !deleted, query }
}
