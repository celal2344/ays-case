import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { Product } from '../schemas'

/** Placeholders until the cart (G4) and checkout (G6) exist: the buttons are real, the actions are not. */
export function useAddToCart() {
  const { t } = useTranslation()
  return (product: Pick<Product, 'title'>) => {
    toast.info(t('products.cartSoon', { title: product.title }))
  }
}

export function useBuyNow() {
  const { t } = useTranslation()
  return (product: Pick<Product, 'title'>) => {
    toast.info(t('products.checkoutSoon', { title: product.title }))
  }
}
