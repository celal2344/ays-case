import { ShoppingCart } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import type { Product } from '../../schemas'
import { ProductImage } from '../product-image'
import { ProductPrice } from '../product-price'

/** Thumbnail, title, price and Add to cart in one row (the sticky buy bar and the section bar share it). */
export function CompactBuy({
  product,
  onAdd,
  className,
}: {
  product: Product
  onAdd: () => void
  className?: string
}) {
  const { t } = useTranslation()
  return (
    <div className={cn('flex min-w-0 items-center gap-3', className)}>
      <ProductImage src={product.thumbnail} alt="" className="size-10 shrink-0 rounded-md" />
      <p className="hidden min-w-0 flex-1 truncate text-sm font-medium sm:block">{product.title}</p>
      <ProductPrice product={product} className="ml-auto sm:ml-0" />
      <Button size="sm" disabled={product.stock <= 0} onClick={onAdd}>
        <ShoppingCart className="size-4" />
        {t('products.addToCart')}
      </Button>
    </div>
  )
}
