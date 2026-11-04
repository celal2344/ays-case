import { useRouter } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { setPendingAction } from '@/features/auth/pending-action'
import { selectUser, useAuthStore } from '@/features/auth/store'
import type { Product } from '@/features/products/schemas'

import { useCartStore } from '../store'

/**
 * Adds to the signed-in user's cart, never beyond stock. Signed-out visitors are sent to login and the
 * action is remembered (`pending-action`), then applied right after sign-in.
 * Returns whether anything is in the cart for this product afterwards.
 */
export function useAddToCart() {
  const { t } = useTranslation()
  const router = useRouter()
  const user = useAuthStore(selectUser)
  const add = useCartStore((s) => s.add)

  return (product: Pick<Product, 'id' | 'title' | 'stock'>, quantity = 1): boolean => {
    if (!user) {
      setPendingAction({ type: 'add-to-cart', productId: product.id, quantity })
      toast.info(t('cart.signInToAdd'))
      void router.navigate({ to: '/login', search: { redirect: router.state.location.href } })
      return false
    }
    if (product.stock <= 0) {
      toast.error(t('cart.outOfStock', { title: product.title }))
      return false
    }
    const before = useCartStore.getState().byUser[user.id]?.find((l) => l.productId === product.id)
    const result = add(user.id, product.id, quantity, product.stock)
    if (result < (before?.quantity ?? 0) + quantity) {
      toast.warning(t('cart.maxReached', { title: product.title, max: result }))
    } else {
      toast.success(t('cart.added', { title: product.title }))
    }
    return true
  }
}

/** Adds, then goes straight to checkout. */
export function useBuyNow() {
  const router = useRouter()
  const addToCart = useAddToCart()
  return (product: Pick<Product, 'id' | 'title' | 'stock'>, quantity = 1) => {
    if (addToCart(product, quantity)) void router.navigate({ to: '/checkout' })
  }
}
