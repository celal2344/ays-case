import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { toAppError } from '@/lib/http-error'

import { isLocal, useProductOverlayStore } from '../overlay-store'
import { productDetailQueryOptions } from '../queries'
import type { ProductDetail } from '../schemas'

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
    if (local) return created ? { ...created, images: [], reviews: [] } : undefined
    return query.data ? { ...query.data, ...patch } : undefined
  }, [deleted, local, created, query.data, patch])

  const notFound =
    deleted || (local ? !created : query.isError && toAppError(query.error).kind === 'not_found')

  return { product, notFound, isPending: !local && query.isPending && !deleted, query }
}
