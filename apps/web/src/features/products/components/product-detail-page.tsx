import { getRouteApi, useLocation, useNavigate } from '@tanstack/react-router'
import { ShoppingCart, Zap } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ErrorState, NotFound, PageSkeleton } from '@/components/feedback/feedback'
import { Button } from '@/components/ui/button'
import { RatingStars } from '@/features/reviews/components/rating-stars'
import { ReviewsTab } from '@/features/reviews/components/reviews-tab'
import { useMediaQuery } from '@/lib/use-media-query'

import type { ReviewSummary } from '@/features/reviews/schemas'
import { useAddToCart, useBuyNow } from '@/features/cart/hooks/use-add-to-cart'
import { FavoriteButton } from '@/features/favorites/components/favorite-button'
import { useCatalog } from '../hooks/use-catalog'
import { useInView } from '../hooks/use-in-view'
import { useProduct } from '../hooks/use-product'
import { useScrollSpy } from '../hooks/use-scroll-spy'
import { DeliveryInfo } from './detail/delivery-info'
import { DetailSection, SECTION_SCROLL_MARGIN } from './detail/detail-section'
import { Gallery } from './detail/gallery'
import { ProductBreadcrumb } from './detail/product-breadcrumb'
import { SectionBar } from './detail/section-bar'
import { QuantityStepper } from '@/components/quantity-stepper'
import { RecentlyViewedStrip } from '@/features/recently-viewed/components/recently-viewed-strip'
import { useRecordView } from '@/features/recently-viewed/hooks/use-recently-viewed'
import { SimilarProducts } from './detail/similar-products'
import { Specs } from './detail/specs'
import { StickyBar } from './detail/sticky-bar'
import { DiscountBadge, StockBadge } from './product-badges'
import { ProductPrice } from './product-price'

const NO_HISTOGRAM = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as const

const route = getRouteApi('/products/$productId')

export function ProductDetailPage() {
  const { t } = useTranslation()
  const { productId } = route.useParams()
  const id = Number(productId)
  const { product, notFound, isPending, query } = useProduct(id)
  const addToCart = useAddToCart()
  const buyNow = useBuyNow()

  const [quantity, setQuantity] = useState(1)
  const actionsRef = useRef<HTMLDivElement>(null)
  const actionsVisible = useInView(actionsRef)
  useRecordView(id, product !== undefined)
  const barRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const hash = useLocation({ select: (location) => location.hash })
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const { products: catalog } = useCatalog()

  const hasSimilar =
    product !== undefined &&
    (catalog ?? []).some((p) => p.category.slug === product.category.slug && p.id !== id)
  const sectionIds = product
    ? ['details', 'description', 'reviews', ...(hasSimilar ? ['similar'] : [])]
    : []
  const [activeSection, setActiveSection] = useScrollSpy(sectionIds, barRef)

  // opening the page with #reviews (or similar) lands on that section once the product has rendered
  const ready = product !== undefined
  useEffect(() => {
    if (ready && hash) {
      document.getElementById(hash)?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' })
    }
    // only when the page becomes ready or the hash changes, not when motion preferences flip
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, hash])

  if (notFound) return <NotFound />
  if (isPending) return <PageSkeleton />
  if (!product) return <ErrorState onRetry={() => void query.refetch()} />

  const outOfStock = product.stock <= 0
  const gallery = product.images.toSorted((a, b) => a.position - b.position).map((i) => i.url)
  const images = gallery.length > 0 ? gallery : product.thumbnail ? [product.thumbnail] : []
  const goToSection = (section: string) => {
    setActiveSection(section)
    void navigate({
      hash: section,
      replace: true,
      resetScroll: false,
      hashScrollIntoView: { behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' },
    })
    document.getElementById(`${section}-heading`)?.focus({ preventScroll: true })
  }
  // rating, count and histogram are computed by the API (SQL); nothing is derived here
  const summary: ReviewSummary = {
    average: product.rating,
    count: product.reviewCount,
    histogram: product.ratingHistogram ?? NO_HISTOGRAM,
  }
  const sections = [
    { id: 'details', label: t('products.tabs.info') },
    { id: 'description', label: t('products.tabs.description') },
    { id: 'reviews', label: t('products.tabs.reviews', { n: summary.count }) },
    ...(hasSimilar ? [{ id: 'similar', label: t('products.similar') }] : []),
  ]

  return (
    <div className="space-y-8 pb-16 md:pb-0">
      <ProductBreadcrumb product={product} />

      <div className="grid gap-8 md:grid-cols-2">
        <Gallery images={images} title={product.title} />

        <div className="space-y-4">
          <div>
            {product.brand ? (
              <p className="text-sm text-muted-foreground">{product.brand.name}</p>
            ) : null}
            <div className="flex items-start justify-between gap-2">
              <h1 className="text-2xl font-semibold">{product.title}</h1>
              <FavoriteButton productId={product.id} title={product.title} overlay />
            </div>
          </div>

          <button
            type="button"
            onClick={() => goToSection('reviews')}
            className="flex items-center gap-2 text-sm hover:underline"
          >
            <RatingStars rating={summary.average ?? 0} />
            {summary.average === null ? (
              <span className="text-muted-foreground">{t('reviews.none')}</span>
            ) : (
              <>
                <span className="font-medium">{summary.average.toFixed(1)}</span>
                <span className="text-muted-foreground">
                  {t('reviews.count', { count: summary.count })}
                </span>
              </>
            )}
          </button>

          <div className="space-y-3 rounded-lg border bg-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <ProductPrice product={product} large />
              <DiscountBadge product={product} />
              <StockBadge product={product} />
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

      <div className="space-y-4">
        <SectionBar
          barRef={barRef}
          sections={sections}
          active={activeSection}
          onSelect={goToSection}
          product={product}
          showBuy={!actionsVisible}
          onAdd={() => addToCart(product, quantity)}
        />
        <DetailSection id="details" title={t('products.tabs.info')}>
          <Specs product={product} />
        </DetailSection>
        <DetailSection id="description" title={t('products.tabs.description')}>
          <p className="max-w-3xl text-muted-foreground">{product.description}</p>
        </DetailSection>
        <DetailSection id="reviews" title={t('products.tabs.reviews', { n: summary.count })}>
          <ReviewsTab productId={id} reviews={product.reviews} summary={summary} />
        </DetailSection>
        <div id="similar" className={SECTION_SCROLL_MARGIN}>
          <SimilarProducts productId={id} category={product.category.slug} />
        </div>
      </div>
      <RecentlyViewedStrip excludeId={id} />

      <StickyBar
        product={product}
        visible={!actionsVisible}
        onAdd={() => addToCart(product, quantity)}
      />
    </div>
  )
}
