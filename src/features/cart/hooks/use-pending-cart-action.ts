import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { consumePendingAction, hasPendingAction } from '@/features/auth/pending-action'
import { selectUser, useAuthStore } from '@/features/auth/store'
import { applyOverlay } from '@/features/products/catalog'
import { useProductOverlayStore } from '@/features/products/overlay-store'
import { catalogQueryOptions } from '@/features/products/queries'

import { useCartStore } from '../store'

/**
 * Applies an "add to cart" that was clicked while signed out, once the user is signed in and the catalog
 * is known (mounted once, in the app shell).
 */
export function usePendingCartAction() {
  const { t } = useTranslation()
  const user = useAuthStore(selectUser)
  const pending = user ? hasPendingAction() : false
  const { data } = useQuery({ ...catalogQueryOptions, enabled: pending })

  useEffect(() => {
    if (!user || !data) return
    const action = consumePendingAction()
    if (!action) return
    const { created, patched, deleted } = useProductOverlayStore.getState()
    const product = applyOverlay(data, { created, patched, deleted }).find(
      (p) => p.id === action.productId,
    )
    if (!product || product.stock <= 0) return
    useCartStore.getState().add(user.id, product.id, action.quantity, product.stock)
    toast.success(t('cart.added', { title: product.title }))
  }, [user, data, t])
}
