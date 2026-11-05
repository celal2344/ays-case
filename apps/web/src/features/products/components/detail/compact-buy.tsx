import { Link } from '@tanstack/react-router'
import { ShoppingCart } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { PendingButton } from '@/components/pending-button'
import { buttonVariants } from '@/components/ui/button'
import { CartLineStepper } from '@/features/cart/components/cart-line-stepper'
import { useAddButton } from '@/features/cart/hooks/use-add-to-cart'
import { useCart } from '@/features/cart/hooks/use-cart'
import { cn } from '@/lib/utils'

import type { Product } from '../../schemas'
import { ProductImage } from '../product-image'
import { ProductPrice } from '../product-price'

/**
 * Thumbnail, title, price and Add to cart in one row (the sticky buy bar and the section bar share it).
 * Once the product is in the cart the button becomes the cart's stepper and a "Go to cart" link.
 */
export function CompactBuy({ product, className }: { product: Product; className?: string }) {
  const { t } = useTranslation()
  const { add, pending, atMax } = useAddButton(product)
  const { lines } = useCart()
  const inCart = lines.some((l) => l.productId === product.id)
  return (
    <div className={cn('flex min-w-0 items-center gap-3', className)}>
      <ProductImage src={product.thumbnail} alt="" className="size-10 shrink-0 rounded-md" />
      <p className="hidden min-w-0 flex-1 truncate text-sm font-medium sm:block">{product.title}</p>
      <ProductPrice product={product} className="ml-auto sm:ml-0" />
      {inCart ? (
        <>
          <CartLineStepper product={product} />
          <Link to="/cart" className={buttonVariants({ size: 'sm' })}>
            {t('cart.goToCart')}
          </Link>
        </>
      ) : (
        <PendingButton
          size="sm"
          pending={pending}
          disabled={product.stock <= 0 || atMax}
          onClick={() => void add()}
        >
          <ShoppingCart className="size-4" />
          {atMax ? t('cart.maxInCart') : t('products.addToCart')}
        </PendingButton>
      )}
    </div>
  )
}
