import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

import { useRecentlyViewed } from '../hooks/use-recently-viewed'
import { RecentlyViewedCard } from './recently-viewed-card'

/**
 * "Recently viewed" on the product page: one compact, scroll-snapping row. The arrows only exist while
 * the row overflows. Renders nothing while the list (minus `excludeId`) is empty.
 */
export function RecentlyViewedStrip({ excludeId }: { excludeId?: number }) {
  const { t } = useTranslation()
  const { items, clear } = useRecentlyViewed(excludeId)
  const rowRef = useRef<HTMLUListElement>(null)
  const [overflows, setOverflows] = useState(false)

  useEffect(() => {
    const row = rowRef.current
    if (!row) return
    const measure = () => setOverflows(row.scrollWidth > row.clientWidth + 1)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(row)
    return () => observer.disconnect()
  }, [items.length])

  if (items.length === 0) return null
  const scroll = (direction: 1 | -1) =>
    rowRef.current?.scrollBy({
      left: direction * rowRef.current.clientWidth * 0.8,
      behavior: 'smooth',
    })

  return (
    <section aria-labelledby="recently-viewed-heading" className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 id="recently-viewed-heading" className="text-base font-semibold">
          {t('recentlyViewed.title')}
        </h2>
        <Button variant="link" size="sm" onClick={clear}>
          {t('recentlyViewed.clear')}
        </Button>
      </div>
      <div className="relative">
        <ul
          ref={rowRef}
          className="flex snap-x snap-mandatory [scrollbar-width:thin] gap-3 overflow-x-auto pb-1"
        >
          {items.map((product) => (
            <li key={product.id} className="contents">
              <RecentlyViewedCard product={product} />
            </li>
          ))}
        </ul>
        {overflows ? (
          <>
            <Button
              variant="outline"
              size="icon-sm"
              className="absolute top-1/2 left-1 -translate-y-1/2 rounded-full"
              aria-label={t('recentlyViewed.previous')}
              onClick={() => scroll(-1)}
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              className="absolute top-1/2 right-1 -translate-y-1/2 rounded-full"
              aria-label={t('recentlyViewed.next')}
              onClick={() => scroll(1)}
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </>
        ) : null}
      </div>
    </section>
  )
}
