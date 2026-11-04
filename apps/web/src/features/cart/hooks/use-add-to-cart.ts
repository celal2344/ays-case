import { useRouter } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { setPendingAction } from '@/features/auth/pending-action'
import { selectUser, useAuthStore } from '@/features/auth/store'
import type { Product } from '@/features/products/schemas'
import { runExclusive, useInFlight } from '@/lib/in-flight'

import { useCart } from './use-cart'

type Addable = Pick<Product, 'id' | 'title' | 'stock'>

const addKey = (productId: number) => `cart:add:${productId}`
const BUY_NOW_KEY = 'cart:buy-now'

/**
 * Adds to the signed-in user's cart, never beyond stock. Signed-out visitors are sent to login and the
 * action is remembered (`pending-action`), then applied right after sign-in.
 * One add per product runs at a time (a repeat click while it is sending is ignored), and its toasts
 * have a stable id so a repeat replaces the message instead of stacking.
 * Resolves with whether anything was added (false when signed out, out of stock, refused or ignored).
 */
export function useAddToCart() {
  const { t } = useTranslation()
  const router = useRouter()
  const user = useAuthStore(selectUser)
  const cart = useCart()

  return async (product: Addable, quantity = 1): Promise<boolean> => {
    const toastId = `cart:${product.id}`
    if (!user) {
      setPendingAction({ type: 'add-to-cart', productId: product.id, quantity })
      toast.info(t('cart.signInToAdd'), { id: 'cart:sign-in' })
      void router.navigate({ to: '/login', search: { redirect: router.state.location.href } })
      return false
    }
    if (product.stock <= 0) {
      toast.error(t('cart.outOfStock', { title: product.title }), { id: toastId })
      return false
    }
    const before = cart.lines.find((l) => l.productId === product.id)?.quantity ?? 0
    if (before >= product.stock) {
      toast.warning(t('cart.maxReached', { title: product.title, max: product.stock }), {
        id: toastId,
      })
      return false
    }
    const added = await runExclusive(addKey(product.id), async () => {
      try {
        const result = await cart.add(product.id, quantity, product.stock, product.title)
        if (result < before + quantity) {
          toast.warning(t('cart.maxReached', { title: product.title, max: result }), {
            id: toastId,
          })
        } else {
          toast.success(t('cart.added', { title: product.title }), { id: toastId })
        }
        return true
      } catch {
        return false // the cart already rolled back and showed why
      }
    })
    return added === true
  }
}

/**
 * What an add-to-cart button needs: the click handler, whether this product is being added
 * (`pending`), and whether the cart already holds all the stock (`atMax`: show it instead of
 * letting the click fail).
 */
export function useAddButton(product: Addable) {
  const addToCart = useAddToCart()
  const { lines } = useCart()
  const pending = useInFlight(addKey(product.id))
  const inCart = lines.find((l) => l.productId === product.id)?.quantity ?? 0
  return {
    add: (quantity = 1) => addToCart(product, quantity),
    pending,
    atMax: product.stock > 0 && inCart >= product.stock,
  }
}

/** Adds, then goes straight to checkout; a second click while it works does nothing. */
export function useBuyNow() {
  const router = useRouter()
  const addToCart = useAddToCart()
  const pending = useInFlight(BUY_NOW_KEY)
  const buyNow = async (product: Addable, quantity = 1) => {
    await runExclusive(BUY_NOW_KEY, async () => {
      if (await addToCart(product, quantity)) await router.navigate({ to: '/checkout' })
    })
  }
  return { buyNow, pending }
}
