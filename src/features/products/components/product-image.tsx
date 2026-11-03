import { ImageOff } from 'lucide-react'
import { useState } from 'react'

import { cn } from '@/lib/utils'

/**
 * Lazy image with a skeleton while it loads and a placeholder when the URL is empty or fails
 * (admin-entered URLs can be wrong). The panel stays white in dark mode so transparent PNGs and
 * product shots on white remain readable.
 */
export function ProductImage({
  src,
  alt,
  className,
  eager = false,
}: {
  src: string
  alt: string
  className?: string
  eager?: boolean
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null)
  const broken = !src || failedSrc === src
  const loading = !broken && loadedSrc !== src
  return (
    <div className={cn('relative aspect-square overflow-hidden bg-white', className)}>
      {broken ? (
        <div className="flex size-full items-center justify-center bg-muted text-muted-foreground">
          <ImageOff className="size-8" aria-hidden="true" />
        </div>
      ) : (
        <>
          {loading ? (
            <div className="absolute inset-0 animate-pulse bg-muted" aria-hidden="true" />
          ) : null}
          <img
            src={src}
            alt={alt}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            onLoad={() => setLoadedSrc(src)}
            onError={() => setFailedSrc(src)}
            className="size-full object-contain"
          />
        </>
      )}
    </div>
  )
}
