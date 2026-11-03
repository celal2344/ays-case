import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

import type { Page } from '../catalog'

export function PaginationBar({
  page,
  onPageChange,
}: {
  page: Page<unknown>
  onPageChange: (page: number) => void
}) {
  const { t } = useTranslation()
  if (page.total === 0) return null
  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {t('products.pagination.showing', { from: page.from, to: page.to, total: page.total })}
      </p>
      <nav className="flex items-center gap-2" aria-label={t('products.pagination.label')}>
        <Button
          variant="outline"
          size="sm"
          disabled={page.page <= 1}
          onClick={() => onPageChange(page.page - 1)}
        >
          <ChevronLeft className="size-4" />
          {t('products.pagination.previous')}
        </Button>
        <span className="text-sm tabular-nums">
          {t('products.pagination.page', { page: page.page, pageCount: page.pageCount })}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page.page >= page.pageCount}
          onClick={() => onPageChange(page.page + 1)}
        >
          {t('products.pagination.next')}
          <ChevronRight className="size-4" />
        </Button>
      </nav>
    </div>
  )
}
