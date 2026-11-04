import { Link, useLocation } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/feedback/feedback'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { selectIsAdmin, selectUser, useAuthStore } from '@/features/auth/store'
import type { Review } from '@/features/products/schemas'

import { useProductReviews } from '../hooks/use-product-reviews'
import { useReviewMutations } from '../hooks/use-review-mutations'
import type { ReviewSort, ReviewSummary } from '../schemas'
import { ReviewCard } from './review-card'
import { ReviewForm } from './review-form'
import { ReviewSummaryPanel } from './review-summary-panel'

const SORTS: ReviewSort[] = ['newest', 'highest', 'lowest']

export function ReviewsTab({
  productId,
  reviews,
  summary,
}: {
  productId: number
  reviews: Review[]
  summary: ReviewSummary
}) {
  const { t } = useTranslation()
  const location = useLocation()
  const user = useAuthStore(selectUser)
  const isAdmin = useAuthStore(selectIsAdmin)
  const { remove } = useReviewMutations(productId)

  const [sort, setSort] = useState<ReviewSort>('newest')
  const [editing, setEditing] = useState(false)
  const items = useProductReviews(reviews, sort)

  const own = user ? items.find((r) => r.authorId === user.id) : undefined
  const sortItems = SORTS.map((value) => ({ value, label: t(`reviews.sort.${value}`) }))

  return (
    <div className="space-y-6" id="reviews">
      <ReviewSummaryPanel summary={summary} />

      {user ? (
        own && !editing ? null : (
          <ReviewForm
            productId={productId}
            editing={own ? { id: own.id, rating: own.rating, comment: own.comment } : undefined}
            onDone={() => setEditing(false)}
          />
        )
      ) : (
        <p className="rounded-lg border p-4 text-sm">
          <Link
            to="/login"
            search={{ redirect: location.href }}
            className="font-medium underline underline-offset-4"
          >
            {t('reviews.signIn')}
          </Link>{' '}
          {t('reviews.signInSuffix')}
        </p>
      )}

      {items.length === 0 ? (
        <EmptyState title={t('reviews.empty')} />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-medium">{t('reviews.title')}</h3>
            <Select
              items={sortItems}
              value={sort}
              onValueChange={(value) => setSort((value ?? 'newest') as ReviewSort)}
            >
              <SelectTrigger aria-label={t('reviews.sort.label')} className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ul className="space-y-3">
            {items.map((review) => {
              const isOwn = Boolean(user && review.authorId === user.id)
              return (
                <ReviewCard
                  key={review.key}
                  review={review}
                  canEdit={isOwn}
                  canDelete={isOwn || isAdmin}
                  onEdit={() => setEditing(true)}
                  onDelete={() => remove.mutate(review.id)}
                />
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
