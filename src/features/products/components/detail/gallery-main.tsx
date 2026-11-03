import { ZoomIn } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useMediaQuery } from '@/lib/use-media-query'

import { ProductImage } from '../product-image'

/**
 * Desktop main image: the area under the mouse pointer is magnified (about 2x, following the pointer);
 * a click opens the lightbox. Touch and reduced-motion users get no hover zoom, only the click.
 */
export function GalleryMain({
  src,
  title,
  onOpen,
}: {
  src: string
  title: string
  onOpen: () => void
}) {
  const { t } = useTranslation()
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null)

  return (
    <button
      type="button"
      onClick={onOpen}
      onPointerMove={(event) => {
        if (event.pointerType !== 'mouse' || reducedMotion) return
        const rect = event.currentTarget.getBoundingClientRect()
        setOrigin({
          x: ((event.clientX - rect.left) / rect.width) * 100,
          y: ((event.clientY - rect.top) / rect.height) * 100,
        })
      }}
      onPointerLeave={() => setOrigin(null)}
      aria-label={t('products.gallery.zoom')}
      className="group relative block flex-1 cursor-zoom-in overflow-hidden rounded-lg border outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <div
        className="transition-transform duration-150"
        style={
          origin
            ? { transform: 'scale(2)', transformOrigin: `${origin.x}% ${origin.y}%` }
            : undefined
        }
      >
        <ProductImage src={src} alt={title} eager className="w-full" />
      </div>
      <ZoomIn
        aria-hidden="true"
        className="absolute right-2 bottom-2 size-5 rounded bg-background/80 p-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
      />
    </button>
  )
}
