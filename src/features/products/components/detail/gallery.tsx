import { ZoomIn } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

import { ProductImage } from '../product-image'

/** Main image with a thumbnail strip; clicking the main image opens a zoom dialog. */
export function Gallery({ images, title }: { images: string[]; title: string }) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState(0)
  const [zoomed, setZoomed] = useState(false)
  const current = images[Math.min(selected, images.length - 1)] ?? ''

  return (
    <div className="flex flex-col gap-3 md:flex-row-reverse">
      <button
        type="button"
        onClick={() => setZoomed(true)}
        aria-label={t('products.gallery.zoom')}
        className="group relative block flex-1 cursor-zoom-in overflow-hidden rounded-lg border outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ProductImage src={current} alt={title} eager className="w-full" />
        <ZoomIn className="absolute right-2 bottom-2 size-5 rounded bg-background/80 p-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
      </button>

      {images.length > 1 ? (
        <ul
          className="flex gap-2 overflow-x-auto md:flex-col"
          aria-label={t('products.gallery.thumbnails')}
        >
          {images.map((src, index) => (
            <li key={src + index} className="shrink-0">
              <button
                type="button"
                aria-label={t('products.gallery.show', { index: index + 1 })}
                aria-current={index === selected}
                onClick={() => setSelected(index)}
                className={cn(
                  'block overflow-hidden rounded-md border-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                  index === selected ? 'border-primary' : 'border-transparent',
                )}
              >
                <ProductImage src={src} alt="" className="size-16" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <Dialog open={zoomed} onOpenChange={setZoomed}>
        <DialogContent className="sm:max-w-3xl">
          <DialogTitle className="sr-only">{title}</DialogTitle>
          <DialogDescription className="sr-only">{t('products.gallery.zoomed')}</DialogDescription>
          <ProductImage src={current} alt={title} eager className="w-full rounded-md" />
        </DialogContent>
      </Dialog>
    </div>
  )
}
