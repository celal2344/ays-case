import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from '@/components/ui/pagination'
import type { Page } from '@/features/products/catalog'
import { getPageRange } from '@/lib/page-range'

/** Where the list starts; after a page change the view returns here and focus moves to it. */
export const RESULTS_ID = 'results'

/**
 * Numbered pager (`1 … 5 6 7 … 17`) with Previous / Next and a go-to-page box. Below `sm` the numbers
 * collapse to "6 / 17". Shared by the shop and both admin tables.
 */
export function PaginationBar({
  page,
  onPageChange,
}: {
  page: Page<unknown>
  onPageChange: (page: number) => void
}) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState('')
  if (page.total === 0) return null

  const goTo = (target: number) => {
    const next = Math.min(Math.max(1, Math.trunc(target)), page.pageCount)
    if (next !== page.page) {
      onPageChange(next)
      // once the new page has rendered: back to the top of the results, focus on them
      requestAnimationFrame(() => {
        const results = document.getElementById(RESULTS_ID)
        results?.scrollIntoView({ block: 'start' })
        results?.focus({ preventScroll: true })
      })
    }
  }

  const submitDraft = () => {
    const value = Number(draft)
    if (draft.trim() !== '' && Number.isFinite(value)) goTo(value)
    setDraft('')
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {t('products.pagination.showing', { from: page.from, to: page.to, total: page.total })}
      </p>

      <Pagination aria-label={t('products.pagination.label')}>
        <PaginationContent className="gap-1">
          <PaginationItem>
            <Button
              variant="outline"
              size="sm"
              disabled={page.page <= 1}
              onClick={() => goTo(page.page - 1)}
            >
              <ChevronLeft className="size-4" />
              {t('products.pagination.previous')}
            </Button>
          </PaginationItem>

          <PaginationItem className="sm:hidden">
            <span
              className="px-2 text-sm tabular-nums"
              aria-label={t('products.pagination.page', {
                page: page.page,
                pageCount: page.pageCount,
              })}
            >
              {t('products.pagination.compact', { page: page.page, pageCount: page.pageCount })}
            </span>
          </PaginationItem>

          {getPageRange(page.page, page.pageCount).map((item, index) =>
            item === 'ellipsis' ? (
              <PaginationItem key={`ellipsis-${index}`} className="hidden sm:block">
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={item} className="hidden sm:block">
                <Button
                  variant={item === page.page ? 'default' : 'ghost'}
                  size="sm"
                  className="min-w-8 tabular-nums"
                  aria-current={item === page.page ? 'page' : undefined}
                  aria-label={t('products.pagination.goToPage', { page: item })}
                  onClick={() => goTo(item)}
                >
                  {item}
                </Button>
              </PaginationItem>
            ),
          )}

          <PaginationItem>
            <Button
              variant="outline"
              size="sm"
              disabled={page.page >= page.pageCount}
              onClick={() => goTo(page.page + 1)}
            >
              {t('products.pagination.next')}
              <ChevronRight className="size-4" />
            </Button>
          </PaginationItem>
        </PaginationContent>
      </Pagination>

      {page.pageCount > 1 ? (
        <form
          // out-of-range numbers are clamped, not rejected by the browser's own validation bubble
          noValidate
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            submitDraft()
          }}
        >
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            max={page.pageCount}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label={t('products.pagination.goTo')}
            placeholder={t('products.pagination.goTo')}
            className="w-32"
          />
          <Button type="submit" variant="outline" size="sm">
            {t('products.pagination.go')}
          </Button>
        </form>
      ) : null}
    </div>
  )
}
