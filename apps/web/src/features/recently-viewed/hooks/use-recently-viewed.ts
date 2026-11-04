import { MAX_RECENTLY_VIEWED } from '@ays/validators'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useRef } from 'react'

import { selectUser, useAuthStore } from '@/features/auth/store'
import { useCatalog } from '@/features/products/hooks/use-catalog'
import { useOptimisticMutation } from '@/lib/optimistic'

import { clearRecentlyViewed, recordView } from '../api'
import { useGuestViewedStore } from '../guest-store'
import { recentlyViewedKeys, recentlyViewedQueryOptions } from '../queries'

const NONE: number[] = []

/** Ids and actions for whoever is looking: the server for a user, memory for a guest. */
function useViewedIds() {
  const userId = useAuthStore(selectUser)?.id
  const query = useQuery({ ...recentlyViewedQueryOptions, enabled: userId !== undefined })
  const guestIds = useGuestViewedStore((s) => s.ids)
  const record = useOptimisticMutation<number[], number>({
    queryKey: recentlyViewedKeys.all,
    mutationFn: recordView,
    update: (old = [], productId) =>
      [productId, ...old.filter((id) => id !== productId)].slice(0, MAX_RECENTLY_VIEWED),
  })
  const clear = useOptimisticMutation<number[], void>({
    queryKey: recentlyViewedKeys.all,
    mutationFn: clearRecentlyViewed,
    update: () => [],
  })
  const { mutate: recordMutate } = record
  const { mutate: clearMutate } = clear
  return {
    userId,
    ids: userId === undefined ? guestIds : (query.data ?? NONE),
    record: (productId: number) =>
      userId === undefined
        ? useGuestViewedStore.getState().record(productId)
        : recordMutate(productId),
    clear: () => (userId === undefined ? useGuestViewedStore.getState().clear() : clearMutate()),
  }
}

/** The current visitor's recently viewed products, newest first, from the merged catalog. */
export function useRecentlyViewed(excludeId?: number) {
  const { ids, clear } = useViewedIds()
  const { products } = useCatalog()
  const items = useMemo(() => {
    const byId = new Map((products ?? []).map((p) => [p.id, p]))
    return ids.filter((id) => id !== excludeId).flatMap((id) => byId.get(id) ?? [])
  }, [ids, products, excludeId])
  return { items, clear }
}

/**
 * Records a visit once the product is known to exist (not for not-found or deleted products), and once
 * the session is known: recording while it is still being restored would log the visit for a guest and
 * again for the user. A ref remembers what was recorded, so the double effect of StrictMode and
 * re-renders do not send it twice.
 */
export function useRecordView(productId: number, exists: boolean) {
  const { userId, record } = useViewedIds()
  const settled = useAuthStore((s) => s.status !== 'restoring')
  const recorded = useRef<string | null>(null)
  useEffect(() => {
    if (!exists || !settled) return
    const visit = `${userId ?? 'guest'}:${productId}`
    if (recorded.current === visit) return
    recorded.current = visit
    record(productId)
    // `record` is rebuilt every render; a visit is recorded when the product or the visitor changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exists, settled, productId, userId])
}
