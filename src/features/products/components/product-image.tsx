import { ImageOff } from 'lucide-react'
import { useState } from 'react'

import { cn } from '@/lib/utils'

/** Lazy image with a placeholder when the URL is empty or fails (admin-entered URLs can be wrong). */
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
  const broken = !src || failedSrc === src
  return (
    <div className={cn('aspect-square overflow-hidden bg-muted', className)}>
      {broken ? (
        <div className="flex size-full items-center justify-center text-muted-foreground">
          <ImageOff className="size-8" aria-hidden="true" />
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFailedSrc(src)}
          className="size-full object-cover"
        />
      )}
    </div>
  )
}
