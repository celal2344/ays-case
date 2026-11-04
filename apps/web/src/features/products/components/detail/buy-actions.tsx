import { ShoppingCart, Zap } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { PendingButton } from '@/components/pending-button'
import { useAddButton, useBuyNow } from '@/features/cart/hooks/use-add-to-cart'

import type { Product } from '../../schemas'

/** "Add to cart" and "Buy now" for the chosen quantity; each ignores repeat clicks while it is sending. */
export function BuyActions({ product, quantity }: { product: Product; quantity: number }) {
  const { t } = useTranslation()
  const { add, pending, atMax } = useAddButton(product)
  const { buyNow, pending: buying } = useBuyNow()
  const outOfStock = product.stock <= 0
  return (
    <>
      <PendingButton
        size="lg"
        pending={pending}
        disabled={outOfStock || atMax || buying}
        onClick={() => void add(quantity)}
      >
        <ShoppingCart className="size-4" />
        {atMax ? t('cart.maxInCart') : t('products.addToCart')}
      </PendingButton>
      <PendingButton
        size="lg"
        variant="outline"
        pending={buying}
        disabled={outOfStock || pending}
        onClick={() => void buyNow(product, quantity)}
      >
        <Zap className="size-4" />
        {t('products.buyNow')}
      </PendingButton>
    </>
  )
}
