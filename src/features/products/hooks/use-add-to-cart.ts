import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'

import type { Product } from '../schemas'

/** Placeholder until the cart exists (G4): the buttons are real, the action is not. */
export function useAddToCart() {
  const { t } = useTranslation()
  return (product: Product) => {
    toast.info(t('products.cartSoon', { title: product.title }))
  }
}
