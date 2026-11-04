import { ShoppingCart } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { PendingButton } from '@/components/pending-button'
import { useAddButton } from '@/features/cart/hooks/use-add-to-cart'
import { cn } from '@/lib/utils'

import type { Product } from '../../schemas'
import { ProductImage } from '../product-image'
import { ProductPrice } from '../product-price'

/** Thumbnail, title, price and Add to cart in one row (the sticky buy bar and the section bar share it). */
export function CompactBuy({
  product,
  quantity,
  className,
}: {
  product: Product
  quantity: number
  className?: string
}) {
  const { t } = useTranslation()
  const { add, pending, atMax } = useAddButton(product)
  return (
    <div className={cn('flex min-w-0 items-center gap-3', className)}>
      <ProductImage src={product.thumbnail} alt="" className="size-10 shrink-0 rounded-md" />
      <p className="hidden min-w-0 flex-1 truncate text-sm font-medium sm:block">{product.title}</p>
      <ProductPrice product={product} className="ml-auto sm:ml-0" />
      <PendingButton
        size="sm"
        pending={pending}
        disabled={product.stock <= 0 || atMax}
        onClick={() => void add(quantity)}
      >
        <ShoppingCart className="size-4" />
        {atMax ? t('cart.maxInCart') : t('products.addToCart')}
      </PendingButton>
    </div>
  )
}
