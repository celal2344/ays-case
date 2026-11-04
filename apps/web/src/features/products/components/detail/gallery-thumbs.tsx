import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import { ProductImage } from '../product-image'

/** Thumbnail strip. The active one keeps the primary border and `aria-current`. */
export function GalleryThumbs({
  images,
  index,
  onSelect,
  hoverSelect = false,
  horizontal = false,
  size = 'size-16',
}: {
  images: string[]
  index: number
  onSelect: (index: number) => void
  /** Pointing at a thumbnail with a mouse selects it too (desktop). */
  hoverSelect?: boolean
  horizontal?: boolean
  size?: string
}) {
  const { t } = useTranslation()
  return (
    <ul
      className={cn(
        'flex gap-2 overflow-x-auto',
        horizontal ? 'justify-center' : 'md:flex-col md:overflow-visible',
      )}
      aria-label={t('products.gallery.thumbnails')}
    >
      {images.map((src, i) => (
        <li key={src + i} className="shrink-0">
          <button
            type="button"
            aria-label={t('products.gallery.show', { index: i + 1 })}
            aria-current={i === index}
            onClick={() => onSelect(i)}
            onPointerEnter={(event) => {
              if (hoverSelect && event.pointerType === 'mouse') onSelect(i)
            }}
            className={cn(
              'block overflow-hidden rounded-md border-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
              i === index ? 'border-primary' : 'border-transparent',
            )}
          >
            <ProductImage src={src} alt="" className={size} />
          </button>
        </li>
      ))}
    </ul>
  )
}
