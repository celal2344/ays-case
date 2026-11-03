import { Star } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

export function RatingStars({ rating, className }: { rating: number; className?: string }) {
  const filled = Math.round(rating)
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} aria-hidden="true">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            'size-4',
            star <= filled ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40',
          )}
        />
      ))}
    </span>
  )
}

/** Accessible 1–5 star picker (radio group, arrow keys move the selection). */
export function StarInput({
  value,
  onChange,
  id,
}: {
  value: number
  onChange: (value: number) => void
  id?: string
}) {
  const { t } = useTranslation()
  const [hover, setHover] = useState(0)
  const shown = hover || value
  return (
    <div
      id={id}
      role="radiogroup"
      aria-label={t('reviews.form.rating')}
      className="inline-flex gap-1"
      onMouseLeave={() => setHover(0)}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={t('reviews.form.stars', { count: star })}
          tabIndex={value === star || (value === 0 && star === 1) ? 0 : -1}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowRight' || event.key === 'ArrowUp')
              onChange(Math.min(5, value + 1))
            if (event.key === 'ArrowLeft' || event.key === 'ArrowDown')
              onChange(Math.max(1, value - 1))
          }}
          className="rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Star
            className={cn(
              'size-6',
              star <= shown ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40',
            )}
          />
        </button>
      ))}
    </div>
  )
}
