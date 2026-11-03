import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { applyOverlay } from '../catalog'
import { useProductOverlayStore } from '../overlay-store'
import { catalogQueryOptions } from '../queries'

/**
 * The only place remote and local product data meet (architecture.md): remote catalog + admin overlay.
 * Every list, detail, cart and checkout view reads products through this hook.
 */
export function useCatalog() {
  const { data, isPending, isError, refetch } = useQuery(catalogQueryOptions)
  const created = useProductOverlayStore((s) => s.created)
  const patched = useProductOverlayStore((s) => s.patched)
  const deleted = useProductOverlayStore((s) => s.deleted)

  const products = useMemo(
    () => (data ? applyOverlay(data, { created, patched, deleted }) : undefined),
    [data, created, patched, deleted],
  )

  return { products, isPending, isError, refetch }
}
