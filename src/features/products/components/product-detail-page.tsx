import { Link, getRouteApi } from '@tanstack/react-router'
import { ArrowLeft, ShoppingCart } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { ErrorState, NotFound, PageSkeleton } from '@/components/feedback/feedback'
import { Button } from '@/components/ui/button'

import { useAddToCart } from '../hooks/use-add-to-cart'
import { useProduct } from '../hooks/use-product'
import { DiscountBadge, StockBadge } from './product-badges'
import { ProductImage } from './product-image'
import { ProductPrice } from './product-price'

const route = getRouteApi('/products/$productId')

/** Minimal detail page; G3b replaces it with the full product page and reviews. */
export function ProductDetailPage() {
  const { t } = useTranslation()
  const { productId } = route.useParams()
  const { product, notFound, isPending, query } = useProduct(Number(productId))
  const addToCart = useAddToCart()

  if (notFound) return <NotFound />
  if (isPending) return <PageSkeleton />
  if (!product) return <ErrorState onRetry={() => void query.refetch()} />

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" render={<Link to="/products" />}>
        <ArrowLeft className="size-4" />
        {t('products.backToList')}
      </Button>
      <div className="grid gap-6 md:grid-cols-2">
        <ProductImage src={product.images[0] ?? product.thumbnail} alt={product.title} eager />
        <div className="space-y-3">
          {product.brand ? <p className="text-sm text-muted-foreground">{product.brand}</p> : null}
          <h1 className="text-2xl font-semibold">{product.title}</h1>
          <div className="flex items-center gap-2">
            <ProductPrice product={product} className="text-xl" />
            <DiscountBadge product={product} />
            <StockBadge stock={product.stock} />
          </div>
          <p className="text-muted-foreground">{product.description}</p>
          <Button disabled={product.stock <= 0} onClick={() => addToCart(product)}>
            <ShoppingCart className="size-4" />
            {t('products.addToCart')}
          </Button>
        </div>
      </div>
    </div>
  )
}
