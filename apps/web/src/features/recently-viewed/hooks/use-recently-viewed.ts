import { useEffect, useMemo } from 'react'

import { selectUser, useAuthStore } from '@/features/auth/store'
import { useCatalog } from '@/features/products/hooks/use-catalog'

import { useRecentlyViewedStore } from '../store'

const NONE: number[] = []

function useUserKey() {
  const user = useAuthStore(selectUser)
  return user ? user.id : 'guest'
}

/** The current visitor's recently viewed products, newest first, from the merged catalog. */
export function useRecentlyViewed(excludeId?: number) {
  const userKey = useUserKey()
  const ids = useRecentlyViewedStore((s) => s.byUser[userKey]) ?? NONE
  const { products } = useCatalog()
  const items = useMemo(() => {
    const byId = new Map((products ?? []).map((p) => [p.id, p]))
    return ids.filter((id) => id !== excludeId).flatMap((id) => byId.get(id) ?? [])
  }, [ids, products, excludeId])
  const clear = () => useRecentlyViewedStore.getState().clear(userKey)
  return { items, clear }
}

/** Records a visit once the product is known to exist (not for not-found or deleted products). */
export function useRecordView(productId: number, exists: boolean) {
  const userKey = useUserKey()
  useEffect(() => {
    if (exists) useRecentlyViewedStore.getState().record(userKey, productId)
  }, [exists, productId, userKey])
}
