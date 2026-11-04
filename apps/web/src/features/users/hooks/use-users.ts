import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { applyUserOverlay } from '../catalog'
import { useUserOverlayStore } from '../overlay-store'
import { usersQueryOptions } from '../queries'

/** Remote users + the admin overlay: the only place the two meet (same pattern as `useCatalog`). */
export function useUsers() {
  const { data, isPending, isError, refetch } = useQuery(usersQueryOptions)
  const created = useUserOverlayStore((s) => s.created)
  const patched = useUserOverlayStore((s) => s.patched)
  const deleted = useUserOverlayStore((s) => s.deleted)

  const users = useMemo(
    () => (data ? applyUserOverlay(data, { created, patched, deleted }) : undefined),
    [data, created, patched, deleted],
  )

  return { users, isPending, isError, refetch }
}
