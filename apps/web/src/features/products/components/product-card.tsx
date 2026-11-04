import { Link } from '@tanstack/react-router'
import { Star, Truck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Card, CardContent, CardFooter } from '@/components/ui/card'

import { CartControls } from '@/features/cart/components/cart-controls'
import { FavoriteButton } from '@/features/favorites/components/favorite-button'
import { qualifiesForFreeShipping } from '../pricing'
import type { Product } from '../schemas'
import { DiscountBadge, StockBadge } from './product-badges'
import { ProductImage } from './product-image'
import { ProductPrice } from './product-price'

export function ProductCard({ product }: { product: Product }) {
  const { t } = useTranslation()
  return (
    <Card className="h-full gap-0 overflow-hidden p-0 transition-shadow hover:shadow-md">
      <div className="relative">
        <Link
          to="/products/$productId"
          params={{ productId: String(product.id) }}
          className="block"
          // the title link below names this card for assistive tech; this one only repeats it
          aria-hidden="true"
          tabIndex={-1}
        >
          <ProductImage src={product.thumbnail} alt="" />
          <div className="absolute top-2 left-2 flex flex-col items-start gap-1">
            <DiscountBadge product={product} />
            <StockBadge stock={product.stock} />
          </div>
        </Link>
        <FavoriteButton
          productId={product.id}
          title={product.title}
          overlay
          className="absolute top-2 right-2"
        />
      </div>
      <CardContent className="flex flex-1 flex-col gap-1 p-3">
        {product.brand ? (
          <p className="truncate text-xs text-muted-foreground">{product.brand}</p>
        ) : null}
        <Link
          to="/products/$productId"
          params={{ productId: String(product.id) }}
          className="line-clamp-2 text-sm font-medium hover:underline"
        >
          {product.title}
        </Link>
        <p
          className="inline-flex w-fit items-center gap-1 rounded-md bg-success px-1.5 py-0.5 text-xs font-semibold text-success-foreground"
          aria-label={t('products.rating', { rating: product.rating.toFixed(1) })}
        >
          {product.rating.toFixed(1)}
          <Star className="size-3 fill-current" aria-hidden="true" />
        </p>
        <ProductPrice product={product} className="mt-auto pt-1" />
        {qualifiesForFreeShipping(product) ? (
          <p className="flex items-center gap-1 text-xs text-success">
            <Truck className="size-3.5" aria-hidden="true" />
            {t('products.freeShipping')}
          </p>
        ) : null}
      </CardContent>
      <CardFooter className="p-3 pt-0">
        <CartControls product={product} />
      </CardFooter>
    </Card>
  )
}
