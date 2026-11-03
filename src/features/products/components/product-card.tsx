import { Link } from '@tanstack/react-router'
import { Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Card, CardContent, CardFooter } from '@/components/ui/card'

import { CartControls } from '@/features/cart/components/cart-controls'
import type { Product } from '../schemas'
import { DiscountBadge, StockBadge } from './product-badges'
import { ProductImage } from './product-image'
import { ProductPrice } from './product-price'

export function ProductCard({ product }: { product: Product }) {
  const { t } = useTranslation()
  return (
    <Card className="h-full gap-0 overflow-hidden p-0">
      <Link
        to="/products/$productId"
        params={{ productId: String(product.id) }}
        className="relative block"
        aria-label={product.title}
      >
        <ProductImage src={product.thumbnail} alt="" />
        <div className="absolute top-2 left-2 flex flex-col items-start gap-1">
          <DiscountBadge product={product} />
          <StockBadge stock={product.stock} />
        </div>
      </Link>
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
          className="flex items-center gap-1 text-xs text-muted-foreground"
          aria-label={t('products.rating', { rating: product.rating.toFixed(1) })}
        >
          <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
          {product.rating.toFixed(1)}
        </p>
        <ProductPrice product={product} className="mt-auto pt-1" />
      </CardContent>
      <CardFooter className="p-3 pt-0">
        <CartControls product={product} />
      </CardFooter>
    </Card>
  )
}
