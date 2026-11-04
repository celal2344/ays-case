import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { consumePendingAction } from '@/features/auth/pending-action'
import { selectUser, useAuthStore } from '@/features/auth/store'

import { useFavoritesStore } from '../store'

/** Applies a heart clicked while signed out, right after sign-in (mounted once, in the app shell). */
export function usePendingFavoriteAction() {
  const { t } = useTranslation()
  const user = useAuthStore(selectUser)

  useEffect(() => {
    if (!user) return
    const action = consumePendingAction('favorite')
    if (!action) return
    const { byUser, toggle } = useFavoritesStore.getState()
    if (!byUser[user.id]?.includes(action.productId)) toggle(user.id, action.productId)
    toast.success(t('favorites.added'))
  }, [user, t])
}
