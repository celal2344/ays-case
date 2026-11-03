import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Carousel, type CarouselApi, CarouselContent, CarouselItem } from '@/components/ui/carousel'

import { ProductImage } from '../product-image'

/** Phone main image: a swipeable carousel kept in sync with the thumbnails; a tap opens the lightbox. */
export function GalleryCarousel({
  images,
  title,
  index,
  onIndexChange,
  onOpen,
}: {
  images: string[]
  title: string
  index: number
  onIndexChange: (index: number) => void
  onOpen: () => void
}) {
  const { t } = useTranslation()
  const [api, setApi] = useState<CarouselApi>()

  // swipe → selected index
  useEffect(() => {
    if (!api) return
    const onSelect = () => onIndexChange(api.selectedScrollSnap())
    api.on('select', onSelect)
    return () => {
      api.off('select', onSelect)
    }
  }, [api, onIndexChange])

  // selected index (thumbnails) → carousel
  useEffect(() => {
    if (api && api.selectedScrollSnap() !== index) api.scrollTo(index)
  }, [api, index])

  return (
    <div className="relative">
      <Carousel setApi={setApi} aria-label={t('products.gallery.carousel')}>
        <CarouselContent className="ml-0">
          {images.map((src, i) => (
            <CarouselItem key={src + i} className="pl-0">
              <button
                type="button"
                onClick={onOpen}
                aria-label={t('products.gallery.zoom')}
                className="block w-full overflow-hidden rounded-lg border outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <ProductImage
                  src={src}
                  alt={i === 0 ? title : `${title} (${i + 1})`}
                  eager={i === 0}
                  className="w-full"
                />
              </button>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      {images.length > 1 ? (
        <p className="pointer-events-none absolute right-2 bottom-2 rounded-full bg-background/90 px-2 py-0.5 text-xs tabular-nums">
          {t('products.gallery.counter', { current: index + 1, total: images.length })}
        </p>
      ) : null}
    </div>
  )
}
