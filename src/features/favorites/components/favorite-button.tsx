import { Heart } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import { useIsFavorite, useToggleFavorite } from '../hooks/use-favorites'

/**
 * The heart: a toggle button (`aria-pressed`) that never triggers the link or row it sits in.
 * `overlay` is the round, translucent version that sits on a product image.
 */
export function FavoriteButton({
  productId,
  title,
  overlay = false,
  className,
}: {
  productId: number
  title: string
  overlay?: boolean
  className?: string
}) {
  const { t } = useTranslation()
  const isFavorite = useIsFavorite(productId)
  const toggle = useToggleFavorite()
  return (
    <button
      type="button"
      aria-pressed={isFavorite}
      aria-label={t(isFavorite ? 'favorites.remove' : 'favorites.add', { title })}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        toggle(productId)
      }}
      className={cn(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50',
        overlay && 'border bg-card/90 shadow-sm',
        isFavorite && 'text-destructive hover:text-destructive',
        className,
      )}
    >
      <Heart className={cn('size-4', isFavorite && 'fill-current')} aria-hidden="true" />
    </button>
  )
}
