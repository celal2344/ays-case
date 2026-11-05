import { Check, Package, Star } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ReviewForm } from '@/features/reviews/components/review-form'
import { useMyReviewedIds } from '@/features/reviews/hooks/use-my-reviews'

import type { Order } from '../schemas'

type Line = Order['lines'][number]

/** The order's distinct products that still exist (a deleted product has no id). */
function reviewable(order: Order) {
  const seen = new Set<number>()
  const lines: (Line & { productId: number })[] = []
  for (const line of order.lines) {
    if (line.productId === null || seen.has(line.productId)) continue
    seen.add(line.productId)
    lines.push({ ...line, productId: line.productId })
  }
  return lines
}

/**
 * "Review" on an order card: the products of that order. Products the user already reviewed say so;
 * the others open the review form.
 */
export function OrderReviewDialog({
  order,
  open,
  onOpenChange,
}: {
  order: Order
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const { reviewed } = useMyReviewedIds()
  const [chosen, setChosen] = useState<number | null>(null)
  const lines = reviewable(order)
  const current = lines.find((line) => line.productId === chosen)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setChosen(null)
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('orders.review.title')}</DialogTitle>
          <DialogDescription>{current ? current.title : t('orders.review.hint')}</DialogDescription>
        </DialogHeader>
        {current ? (
          <div className="space-y-3">
            <ReviewForm productId={current.productId} onDone={() => setChosen(null)} />
            <Button variant="ghost" className="w-full" onClick={() => setChosen(null)}>
              {t('orders.review.back')}
            </Button>
          </div>
        ) : (
          <ul className="space-y-2">
            {lines.map((line) => {
              const done = reviewed.has(line.productId)
              return (
                <li
                  key={line.productId}
                  className="flex items-center gap-3 rounded-xl border p-2.5"
                >
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-lg border bg-white">
                    {line.thumbnail ? (
                      <img
                        src={line.thumbnail}
                        alt=""
                        width={48}
                        height={48}
                        loading="lazy"
                        className="size-12 object-contain"
                      />
                    ) : (
                      <Package className="size-5 text-muted-foreground" aria-hidden="true" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-medium">
                    <span className="line-clamp-2">{line.title}</span>
                  </span>
                  {done ? (
                    <Badge variant="secondary" className="gap-1">
                      <Check className="size-3" aria-hidden="true" />
                      {t('orders.review.reviewed')}
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      aria-label={`${t('orders.review.button')}: ${line.title}`}
                      onClick={() => setChosen(line.productId)}
                    >
                      <Star className="size-3.5" aria-hidden="true" />
                      {t('orders.review.button')}
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
