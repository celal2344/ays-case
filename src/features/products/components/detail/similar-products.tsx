import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'

import { useCatalog } from '../../hooks/use-catalog'
import { ProductCard } from '../product-card'

const MAX_SIMILAR = 12

/** Other products of the same category, from the merged catalog (so admin edits and deletes apply). */
export function SimilarProducts({ productId, category }: { productId: number; category: string }) {
  const { t } = useTranslation()
  const { products } = useCatalog()
  const similar = useMemo(
    () =>
      (products ?? [])
        .filter((p) => p.category === category && p.id !== productId)
        .slice(0, MAX_SIMILAR),
    [products, category, productId],
  )
  if (similar.length === 0) return null

  return (
    <section aria-labelledby="similar-heading" className="space-y-3">
      <h2 id="similar-heading" className="text-lg font-semibold">
        {t('products.similar')}
      </h2>
      <Carousel opts={{ align: 'start' }} className="px-10">
        <CarouselContent>
          {similar.map((product) => (
            <CarouselItem
              key={product.id}
              className="basis-3/4 sm:basis-1/2 lg:basis-1/3 xl:basis-1/4"
            >
              <ProductCard product={product} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </section>
  )
}
