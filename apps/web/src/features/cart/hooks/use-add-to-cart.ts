import { useRouter } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { setPendingAction } from '@/features/auth/pending-action'
import { selectUser, useAuthStore } from '@/features/auth/store'
import type { Product } from '@/features/products/schemas'

import { useCart } from './use-cart'

type Addable = Pick<Product, 'id' | 'title' | 'stock'>

/**
 * Adds to the signed-in user's cart, never beyond stock. Signed-out visitors are sent to login and the
 * action is remembered (`pending-action`), then applied right after sign-in.
 * Resolves with whether anything was added (false when signed out, out of stock, or refused).
 */
export function useAddToCart() {
  const { t } = useTranslation()
  const router = useRouter()
  const user = useAuthStore(selectUser)
  const cart = useCart()

  return async (product: Addable, quantity = 1): Promise<boolean> => {
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
    const before = cart.lines.find((l) => l.productId === product.id)?.quantity ?? 0
    try {
      const result = await cart.add(product.id, quantity, product.stock, product.title)
      if (result < before + quantity) {
        toast.warning(t('cart.maxReached', { title: product.title, max: result }))
      } else {
        toast.success(t('cart.added', { title: product.title }))
      }
      return true
    } catch {
      return false // the cart already rolled back and showed why
    }
  }
}

/** Adds, then goes straight to checkout. */
export function useBuyNow() {
  const router = useRouter()
  const addToCart = useAddToCart()
  return async (product: Addable, quantity = 1) => {
    if (await addToCart(product, quantity)) void router.navigate({ to: '/checkout' })
  }
}
