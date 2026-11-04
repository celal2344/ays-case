import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { consumePendingAction } from '@/features/auth/pending-action'
import { selectUser, useAuthStore } from '@/features/auth/store'
import { errorMessageKey } from '@/lib/error-message'
import { toAppError } from '@/lib/http-error'

import { addFavorite } from '../api'
import { favoriteKeys } from '../queries'

/** Applies a heart clicked while signed out, right after sign-in (mounted once, in the app shell). */
export function usePendingFavoriteAction() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const user = useAuthStore(selectUser)

  useEffect(() => {
    if (!user) return
    const action = consumePendingAction('favorite')
    if (!action) return
    // adding is idempotent, so a product that is already a favorite stays one
    addFavorite(action.productId).then(
      () => {
        void queryClient.invalidateQueries({ queryKey: favoriteKeys.all })
        toast.success(t('favorites.added'))
      },
      (error: unknown) => toast.error(t(errorMessageKey(toAppError(error)))),
    )
  }, [user, queryClient, t])
}
