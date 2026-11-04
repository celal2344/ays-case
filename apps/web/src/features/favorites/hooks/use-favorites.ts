import { useQuery } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { setPendingAction } from '@/features/auth/pending-action'
import { selectUser, useAuthStore } from '@/features/auth/store'
import { useCatalog } from '@/features/products/hooks/use-catalog'
import { errorMessageKey } from '@/lib/error-message'
import { useOptimisticMutation } from '@/lib/optimistic'

import { addFavorite, removeFavorite } from '../api'
import { favoriteKeys, favoritesQueryOptions } from '../queries'

const NONE: number[] = []

/** The signed-in user's favorite product ids, newest first, from the server. */
export function useFavorites() {
  const userId = useAuthStore(selectUser)?.id
  const query = useQuery({ ...favoritesQueryOptions, enabled: userId !== undefined })
  const ids = (userId === undefined ? undefined : query.data) ?? NONE
  return useMemo(
    () => ({ userId, ids, count: ids.length, isPending: userId !== undefined && query.isPending }),
    [userId, ids, query.isPending],
  )
}

export function useIsFavorite(productId: number) {
  return useFavorites().ids.includes(productId)
}

/** Favorites joined with the merged catalog; products that no longer exist are dropped. */
export function useFavoriteProducts() {
  const { ids, isPending: favoritesPending } = useFavorites()
  const { products, isPending, isError, refetch } = useCatalog()
  const items = useMemo(() => {
    if (!products) return undefined
    const byId = new Map(products.map((p) => [p.id, p]))
    return ids.flatMap((id) => byId.get(id) ?? [])
  }, [ids, products])
  return { items, isPending: isPending || favoritesPending, isError, refetch }
}

/**
 * The heart's action. Signed out: remember the favorite, go to login and come back (applied after
 * sign-in by `usePendingFavoriteAction`). Signed in: the heart flips at once and rolls back on error.
 */
export function useToggleFavorite() {
  const { t } = useTranslation()
  const router = useRouter()
  const { userId, ids } = useFavorites()
  const toggle = useOptimisticMutation<number[], { productId: number; on: boolean }>({
    queryKey: favoriteKeys.all,
    mutationFn: ({ productId, on }) => (on ? addFavorite(productId) : removeFavorite(productId)),
    update: (old = [], { productId, on }) =>
      on
        ? [productId, ...old.filter((id) => id !== productId)]
        : old.filter((id) => id !== productId),
    onError: (error) => toast.error(t(errorMessageKey(error))),
  })
  const { mutate } = toggle
  return (productId: number) => {
    if (userId === undefined) {
      setPendingAction({ type: 'favorite', productId })
      toast.info(t('favorites.signIn'))
      void router.navigate({ to: '/login', search: { redirect: router.state.location.href } })
      return
    }
    const on = !ids.includes(productId)
    mutate({ productId, on })
    toast.success(t(on ? 'favorites.added' : 'favorites.removed'))
  }
}
