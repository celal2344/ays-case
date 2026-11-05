import { Link } from '@tanstack/react-router'
import { ArrowRight, ShoppingCart, Zap } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { PendingButton } from '@/components/pending-button'
import { buttonVariants } from '@/components/ui/button'
import { CartLineStepper } from '@/features/cart/components/cart-line-stepper'
import { useAddButton, useBuyNow } from '@/features/cart/hooks/use-add-to-cart'
import { useCart } from '@/features/cart/hooks/use-cart'

import type { Product } from '../../schemas'

/**
 * The product page's purchase row. Until the product is in the cart: "Add to cart" and "Buy now". Once it is: "In cart" with the cart's own stepper, "Go to cart" and "Buy now"
 * (which just goes to checkout). Each button ignores repeat clicks while it is sending.
 */
export function BuyActions({ product }: { product: Product }) {
  const { t } = useTranslation()
  const { add, pending, atMax } = useAddButton(product)
  const { buyNow, pending: buying } = useBuyNow()
  const { lines } = useCart()
  const inCart = lines.some((l) => l.productId === product.id)
  const outOfStock = product.stock <= 0

  if (inCart) {
    return (
      <>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{t('cart.inCart')}</span>
          <CartLineStepper product={product} />
        </div>
        <Link to="/cart" className={buttonVariants({ size: 'lg' })}>
          {t('cart.goToCart')}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
        <Link to="/checkout" className={buttonVariants({ size: 'lg', variant: 'outline' })}>
          <Zap className="size-4" aria-hidden="true" />
          {t('products.buyNow')}
        </Link>
      </>
    )
  }

  return (
    <>
      <PendingButton
        size="lg"
        pending={pending}
        disabled={outOfStock || atMax || buying}
        onClick={() => void add()}
      >
        <ShoppingCart className="size-4" />
        {atMax ? t('cart.maxInCart') : t('products.addToCart')}
      </PendingButton>
      <PendingButton
        size="lg"
        variant="outline"
        pending={buying}
        disabled={outOfStock || pending}
        onClick={() => void buyNow(product)}
      >
        <Zap className="size-4" />
        {t('products.buyNow')}
      </PendingButton>
    </>
  )
}
