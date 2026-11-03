import { getRouteApi } from '@tanstack/react-router'
import { ShoppingCart, Zap } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ErrorState, NotFound, PageSkeleton } from '@/components/feedback/feedback'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useProductReviews } from '@/features/reviews/hooks/use-product-reviews'
import { RatingStars } from '@/features/reviews/components/rating-stars'
import { ReviewsTab } from '@/features/reviews/components/reviews-tab'

import type { Review } from '../schemas'
import { useAddToCart, useBuyNow } from '@/features/cart/hooks/use-add-to-cart'
import { useInView } from '../hooks/use-in-view'
import { useProduct } from '../hooks/use-product'
import { DeliveryInfo } from './detail/delivery-info'
import { Gallery } from './detail/gallery'
import { ProductBreadcrumb } from './detail/product-breadcrumb'
import { QuantityStepper } from '@/components/quantity-stepper'
import { SimilarProducts } from './detail/similar-products'
import { Specs } from './detail/specs'
import { StickyBar } from './detail/sticky-bar'
import { DiscountBadge, StockBadge } from './product-badges'
import { ProductPrice } from './product-price'

const NO_REVIEWS: Review[] = []

const route = getRouteApi('/products/$productId')

type DetailTab = 'info' | 'description' | 'reviews'

export function ProductDetailPage() {
  const { t } = useTranslation()
  const { productId } = route.useParams()
  const id = Number(productId)
  const { product, notFound, isPending, query } = useProduct(id)
  const addToCart = useAddToCart()
  const buyNow = useBuyNow()

  const [quantity, setQuantity] = useState(1)
  const [tab, setTab] = useState<DetailTab>('info')
  const actionsRef = useRef<HTMLDivElement>(null)
  const actionsVisible = useInView(actionsRef)
  const { summary } = useProductReviews(id, product?.reviews ?? NO_REVIEWS, 'newest')

  if (notFound) return <NotFound />
  if (isPending) return <PageSkeleton />
  if (!product) return <ErrorState onRetry={() => void query.refetch()} />

  const outOfStock = product.stock <= 0
  const images = product.images.length > 0 ? product.images : [product.thumbnail]
  const showReviews = () => {
    setTab('reviews')
    document.getElementById('product-tabs')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="space-y-8 pb-16 md:pb-0">
      <ProductBreadcrumb product={product} />

      <div className="grid gap-8 md:grid-cols-2">
        <Gallery images={images} title={product.title} />

        <div className="space-y-4">
          <div>
            {product.brand ? (
              <p className="text-sm text-muted-foreground">{product.brand}</p>
            ) : null}
            <h1 className="text-2xl font-semibold">{product.title}</h1>
          </div>

          <button
            type="button"
            onClick={showReviews}
            className="flex items-center gap-2 text-sm hover:underline"
          >
            <RatingStars rating={summary.count > 0 ? summary.average : product.rating} />
            <span className="font-medium">
              {(summary.count > 0 ? summary.average : product.rating).toFixed(1)}
            </span>
            <span className="text-muted-foreground">
              {t('reviews.count', { count: summary.count })}
            </span>
          </button>

          <div className="space-y-3 rounded-lg border bg-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <ProductPrice product={product} large />
              <DiscountBadge product={product} />
              <StockBadge stock={product.stock} />
            </div>
            <div className="flex flex-wrap items-center gap-3" ref={actionsRef}>
              <QuantityStepper
                value={quantity}
                max={Math.max(1, product.stock)}
                onChange={setQuantity}
              />
              <Button size="lg" disabled={outOfStock} onClick={() => addToCart(product, quantity)}>
                <ShoppingCart className="size-4" />
                {t('products.addToCart')}
              </Button>
              <Button
                size="lg"
                variant="outline"
                disabled={outOfStock}
                onClick={() => buyNow(product, quantity)}
              >
                <Zap className="size-4" />
                {t('products.buyNow')}
              </Button>
            </div>
          </div>
          <DeliveryInfo product={product} />
        </div>
      </div>

      <Tabs id="product-tabs" value={tab} onValueChange={(value) => setTab(value as DetailTab)}>
        <TabsList>
          <TabsTrigger value="info" className="text-muted-foreground data-active:text-foreground">
            {t('products.tabs.info')}
          </TabsTrigger>
          <TabsTrigger
            value="description"
            className="text-muted-foreground data-active:text-foreground"
          >
            {t('products.tabs.description')}
          </TabsTrigger>
          <TabsTrigger
            value="reviews"
            className="text-muted-foreground data-active:text-foreground"
          >
            {t('products.tabs.reviews', { n: summary.count })}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="info" className="pt-4">
          <Specs product={product} />
        </TabsContent>
        <TabsContent value="description" className="pt-4">
          <p className="max-w-3xl text-muted-foreground">{product.description}</p>
        </TabsContent>
        <TabsContent value="reviews" className="pt-4">
          <ReviewsTab productId={id} seeded={product.reviews} />
        </TabsContent>
      </Tabs>

      <SimilarProducts productId={id} category={product.category} />

      <StickyBar
        product={product}
        visible={!actionsVisible}
        onAdd={() => addToCart(product, quantity)}
      />
    </div>
  )
}
