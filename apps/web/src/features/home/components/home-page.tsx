import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { ErrorState } from '@/components/feedback/feedback'
import { Skeleton } from '@/components/ui/skeleton'
import { useCatalog } from '@/features/products/hooks/use-catalog'
import { RecentlyViewedStrip } from '@/features/recently-viewed/components/recently-viewed-strip'

import {
  categoryTiles,
  dealProducts,
  groupCutouts,
  heroProducts,
  newestProducts,
  topBrands,
  topRatedProducts,
} from '../selectors'
import { CategoryTiles } from './category-tiles'
import { Hero } from './hero'
import { ProductSection } from './product-section'
import { PromoBanners, type Banner } from './promo-banners'

const banner = (
  products: Parameters<typeof topBrands>[0],
  group: 'beauty' | 'electronics',
  n: number,
) => {
  const brands = topBrands(products, group, n)
  return brands.length === 0
    ? undefined
    : ({ group, brands, cutouts: groupCutouts(products, group) } satisfies Banner)
}

export function HomeSkeleton() {
  return (
    <div aria-busy="true" className="space-y-10">
      <Skeleton className="h-[560px] w-full rounded-none" />
      <div className="page-container grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-7">
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton key={i} className="h-[210px] rounded-[22px]" />
        ))}
      </div>
      <div className="page-container grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-80" />
        ))}
      </div>
    </div>
  )
}

export function HomePage() {
  const { t } = useTranslation()
  const { products, isError, refetch } = useCatalog()
  const view = useMemo(() => {
    if (!products) return undefined
    return {
      hero: heroProducts(products),
      tiles: categoryTiles(products),
      deals: dealProducts(products),
      top: topRatedProducts(products),
      newest: newestProducts(products),
      beauty: banner(products, 'beauty', 2),
      electronics: banner(products, 'electronics', 3),
    }
  }, [products])

  if (isError) return <ErrorState onRetry={() => void refetch()} />
  if (!products || !view) return <HomeSkeleton />

  return (
    <>
      <Hero products={products} hero={view.hero} />
      <CategoryTiles tiles={view.tiles} />
      <ProductSection
        title={t('home.sections.deals.title')}
        subtitle={t('home.sections.deals.sub')}
        products={view.deals}
        search={{ sort: 'discount', order: 'desc' }}
      />
      <PromoBanners beauty={view.beauty} electronics={view.electronics} />
      <ProductSection
        title={t('home.sections.top.title')}
        subtitle={t('home.sections.top.sub')}
        products={view.top}
        search={{ sort: 'rating', order: 'desc' }}
      />
      <ProductSection
        title={t('home.sections.newest.title')}
        subtitle={t('home.sections.newest.sub')}
        products={view.newest}
        search={{ sort: 'newest', order: 'desc' }}
        isNew
      />
      <div className="page-container pt-12 empty:hidden">
        <RecentlyViewedStrip />
      </div>
    </>
  )
}
