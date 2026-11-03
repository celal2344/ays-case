import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'

import { ProductImage } from '../product-image'
import { GalleryThumbs } from './gallery-thumbs'

const ZOOM = 2
const SWIPE_PX = 50
const TAP_PX = 5
const DOUBLE_TAP_MS = 300

interface Drag {
  x: number
  y: number
  panX: number
  panY: number
  moved: boolean
}

/**
 * One enlarged image. Click (mouse) or double-tap toggles a 2x zoom, dragging pans while zoomed, and a
 * horizontal swipe changes the image while not zoomed. Remounted per image (`key`), so zoom resets.
 */
function Stage({
  src,
  alt,
  onSwipe,
}: {
  src: string
  alt: string
  onSwipe: (delta: 1 | -1) => void
}) {
  const [zoomed, setZoomed] = useState(false)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const drag = useRef<Drag | null>(null)
  const lastTap = useRef(0)
  const box = useRef<HTMLDivElement>(null)

  const limit = () => (box.current?.getBoundingClientRect().width ?? 0) / 2
  const clamp = (value: number) => Math.max(-limit(), Math.min(limit(), value))

  return (
    <div
      ref={box}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId)
        drag.current = {
          x: event.clientX,
          y: event.clientY,
          panX: pan.x,
          panY: pan.y,
          moved: false,
        }
        setDragging(true)
      }}
      onPointerMove={(event) => {
        const d = drag.current
        if (!d) return
        const dx = event.clientX - d.x
        const dy = event.clientY - d.y
        if (Math.hypot(dx, dy) > TAP_PX) d.moved = true
        if (zoomed) setPan({ x: clamp(d.panX + dx), y: clamp(d.panY + dy) })
      }}
      onPointerUp={(event) => {
        const d = drag.current
        drag.current = null
        setDragging(false)
        if (!d) return
        const dx = event.clientX - d.x
        const dy = event.clientY - d.y
        if (d.moved) {
          if (!zoomed && Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy))
            onSwipe(dx < 0 ? 1 : -1)
          return
        }
        const now = event.timeStamp
        if (event.pointerType === 'mouse' || now - lastTap.current < DOUBLE_TAP_MS) {
          lastTap.current = 0
          setZoomed((z) => !z)
          setPan({ x: 0, y: 0 })
        } else {
          lastTap.current = now
        }
      }}
      onPointerCancel={() => {
        drag.current = null
        setDragging(false)
      }}
      className="relative mx-auto aspect-square touch-none overflow-hidden rounded-md bg-white select-none"
      style={{
        width: 'min(100%, 68dvh)',
        cursor: zoomed ? (dragging ? 'grabbing' : 'grab') : 'zoom-in',
      }}
    >
      <div
        className={dragging ? undefined : 'transition-transform duration-150'}
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomed ? ZOOM : 1})` }}
      >
        <ProductImage src={src} alt={alt} eager className="pointer-events-none w-full" />
      </div>
    </div>
  )
}

/** Full-size viewer: previous/next (buttons, arrow keys, swipe), counter, thumbnails, zoom and pan. */
export function GalleryLightbox({
  images,
  title,
  index,
  onIndexChange,
  open,
  onOpenChange,
}: {
  images: string[]
  title: string
  index: number
  onIndexChange: (index: number) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const count = images.length
  const multiple = count > 1
  const go = (delta: 1 | -1) => onIndexChange((index + delta + count) % count)

  // the next image is fetched before it is asked for
  const next = images[(index + 1) % count]
  useEffect(() => {
    if (!open || !multiple || !next) return
    new Image().src = next
  }, [open, multiple, next])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[96dvh] gap-3 sm:max-w-4xl"
        onKeyDown={(event) => {
          if (!multiple) return
          if (event.key === 'ArrowLeft') go(-1)
          if (event.key === 'ArrowRight') go(1)
        }}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">{t('products.gallery.zoomed')}</DialogDescription>
        <DialogClose
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute top-2 right-2 z-10"
              aria-label={t('products.gallery.close')}
            />
          }
        >
          <X aria-hidden="true" />
        </DialogClose>

        <div className="relative">
          <Stage
            key={index}
            src={images[index] ?? ''}
            alt={`${title} (${index + 1}/${count})`}
            onSwipe={go}
          />
          {multiple ? (
            <>
              <Button
                variant="secondary"
                size="icon"
                className="absolute top-1/2 left-1 -translate-y-1/2 rounded-full"
                aria-label={t('products.gallery.previous')}
                onClick={() => go(-1)}
              >
                <ChevronLeft aria-hidden="true" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="absolute top-1/2 right-1 -translate-y-1/2 rounded-full"
                aria-label={t('products.gallery.next')}
                onClick={() => go(1)}
              >
                <ChevronRight aria-hidden="true" />
              </Button>
            </>
          ) : null}
        </div>

        {multiple ? (
          <>
            <p className="text-center text-sm tabular-nums" aria-live="polite">
              {t('products.gallery.counter', { current: index + 1, total: count })}
            </p>
            <GalleryThumbs
              images={images}
              index={index}
              onSelect={onIndexChange}
              horizontal
              size="size-12"
            />
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
