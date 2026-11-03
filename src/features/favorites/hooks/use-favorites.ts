import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

import { setPendingAction } from '@/features/auth/pending-action'
import { selectUser, useAuthStore } from '@/features/auth/store'
import { useCatalog } from '@/features/products/hooks/use-catalog'

import { useFavoritesStore } from '../store'

const NONE: number[] = []

/** The signed-in user's favorite product ids, newest first. Components never pass a user id. */
export function useFavorites() {
  const userId = useAuthStore(selectUser)?.id
  const ids =
    useFavoritesStore((s) => (userId === undefined ? undefined : s.byUser[userId])) ?? NONE
  return useMemo(() => ({ userId, ids, count: ids.length }), [userId, ids])
}

export function useIsFavorite(productId: number) {
  const userId = useAuthStore(selectUser)?.id
  return useFavoritesStore((s) =>
    userId === undefined ? false : (s.byUser[userId]?.includes(productId) ?? false),
  )
}

/** Favorites joined with the merged catalog; products that no longer exist are dropped. */
export function useFavoriteProducts() {
  const { ids } = useFavorites()
  const { products, isPending, isError, refetch } = useCatalog()
  const items = useMemo(() => {
    if (!products) return undefined
    const byId = new Map(products.map((p) => [p.id, p]))
    return ids.flatMap((id) => byId.get(id) ?? [])
  }, [ids, products])
  return { items, isPending, isError, refetch }
}

/**
 * The heart's action. Signed out: remember the favorite, go to login and come back (applied after
 * sign-in by `usePendingFavoriteAction`).
 */
export function useToggleFavorite() {
  const { t } = useTranslation()
  const router = useRouter()
  const user = useAuthStore(selectUser)
  return (productId: number) => {
    if (!user) {
      setPendingAction({ type: 'favorite', productId })
      toast.info(t('favorites.signIn'))
      void router.navigate({ to: '/login', search: { redirect: router.state.location.href } })
      return
    }
    const now = useFavoritesStore.getState().toggle(user.id, productId)
    toast.success(t(now ? 'favorites.added' : 'favorites.removed'))
  }
}
