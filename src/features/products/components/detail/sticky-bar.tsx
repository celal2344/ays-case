import { ShoppingCart } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

import type { Product } from '../../schemas'
import { ProductImage } from '../product-image'
import { ProductPrice } from '../product-price'

/** Appears once the main buttons scroll out of view: under the header on desktop, at the bottom on mobile. */
export function StickyBar({
  product,
  visible,
  onAdd,
}: {
  product: Product
  visible: boolean
  onAdd: () => void
}) {
  const { t } = useTranslation()
  if (!visible) return null
  return (
    <div
      role="region"
      aria-label={t('products.sticky')}
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 shadow-lg backdrop-blur md:top-(--header-h) md:bottom-auto md:border-t-0 md:border-b"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2">
        <ProductImage src={product.thumbnail} alt="" className="size-10 shrink-0 rounded-md" />
        <p className="hidden min-w-0 flex-1 truncate text-sm font-medium sm:block">
          {product.title}
        </p>
        <ProductPrice product={product} className="ml-auto sm:ml-0" />
        <Button size="sm" disabled={product.stock <= 0} onClick={onAdd}>
          <ShoppingCart className="size-4" />
          {t('products.addToCart')}
        </Button>
      </div>
    </div>
  )
}
