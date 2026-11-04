import { useState } from 'react'

import { useMediaQuery } from '@/lib/use-media-query'

import { GalleryCarousel } from './gallery-carousel'
import { GalleryLightbox } from './gallery-lightbox'
import { GalleryMain } from './gallery-main'
import { GalleryThumbs } from './gallery-thumbs'

/**
 * Product images. Desktop: hover-zoom main image with a thumbnail column. Phone: swipeable carousel
 * with thumbnails below. Both open the same lightbox. One image (or none): no thumbnails or arrows.
 */
export function Gallery({ images, title }: { images: string[]; title: string }) {
  const desktop = useMediaQuery('(min-width: 768px)')
  const [selected, setSelected] = useState(0)
  const [open, setOpen] = useState(false)
  const index = Math.min(selected, Math.max(images.length - 1, 0))

  return (
    <div className="flex flex-col gap-3 md:flex-row-reverse">
      {desktop ? (
        <GalleryMain src={images[index] ?? ''} title={title} onOpen={() => setOpen(true)} />
      ) : (
        <GalleryCarousel
          images={images}
          title={title}
          index={index}
          onIndexChange={setSelected}
          onOpen={() => setOpen(true)}
        />
      )}

      {images.length > 1 ? (
        <GalleryThumbs images={images} index={index} onSelect={setSelected} hoverSelect={desktop} />
      ) : null}

      <GalleryLightbox
        images={images}
        title={title}
        index={index}
        onIndexChange={setSelected}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  )
}
