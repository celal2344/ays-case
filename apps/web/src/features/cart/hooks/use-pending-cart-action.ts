import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { consumePendingAction, hasPendingAction } from '@/features/auth/pending-action'
import { selectUser, useAuthStore } from '@/features/auth/store'
import { applyOverlay } from '@/features/products/catalog'
import { useProductOverlayStore } from '@/features/products/overlay-store'
import { catalogQueryOptions } from '@/features/products/queries'

import { useCart } from './use-cart'

/**
 * Applies an "add to cart" that was clicked while signed out, once the user is signed in and the catalog
 * is known (mounted once, in the app shell).
 */
export function usePendingCartAction() {
  const { t } = useTranslation()
  const user = useAuthStore(selectUser)
  const { add } = useCart()
  const pending = user ? hasPendingAction('add-to-cart') : false
  const { data } = useQuery({ ...catalogQueryOptions, enabled: pending })

  useEffect(() => {
    if (!user || !data) return
    const action = consumePendingAction('add-to-cart')
    if (!action) return
    const { created, patched, deleted } = useProductOverlayStore.getState()
    const product = applyOverlay(data, { created, patched, deleted }).find(
      (p) => p.id === action.productId,
    )
    if (!product || product.stock <= 0) return
    void add(product.id, action.quantity, product.stock, product.title).then(
      () => toast.success(t('cart.added', { title: product.title })),
      () => undefined, // the cart already rolled back and showed why
    )
    // `add` changes with the cart contents; the action is consumed once, so it must not re-run
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, data, t])
}
