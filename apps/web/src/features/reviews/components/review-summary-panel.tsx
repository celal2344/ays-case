import { useTranslation } from 'react-i18next'

import type { ReviewSummary } from '../schemas'
import { RatingStars } from './rating-stars'

export function ReviewSummaryPanel({ summary }: { summary: ReviewSummary }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="flex flex-col items-center gap-1 sm:w-40">
        <p className="text-4xl font-semibold" data-testid="review-average">
          {summary.average === null ? '–' : summary.average.toFixed(1)}
        </p>
        <RatingStars rating={summary.average ?? 0} />
        <p className="text-sm text-muted-foreground">
          {t('reviews.count', { count: summary.count })}
        </p>
      </div>
      <ul className="flex-1 space-y-1.5" aria-label={t('reviews.histogram')}>
        {([5, 4, 3, 2, 1] as const).map((star) => {
          const count = summary.histogram[String(star) as '1' | '2' | '3' | '4' | '5']
          const percent = summary.count === 0 ? 0 : (count / summary.count) * 100
          return (
            <li key={star} className="flex items-center gap-2 text-sm">
              <span className="w-10 shrink-0 tabular-nums">
                {t('reviews.starsShort', { star })}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-amber-400" style={{ width: `${percent}%` }} />
              </div>
              <span className="w-8 shrink-0 text-right text-muted-foreground tabular-nums">
                {count}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
