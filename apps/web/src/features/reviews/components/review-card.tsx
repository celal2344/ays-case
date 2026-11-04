import { BadgeCheck, Pencil, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/format'
import { selectLanguage, usePreferencesStore } from '@/preferences/store'

import type { ReviewItem } from '../schemas'
import { RatingStars } from './rating-stars'

export function ReviewCard({
  review,
  verified,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: {
  review: ReviewItem
  verified: boolean
  canEdit: boolean
  canDelete: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const { t } = useTranslation()
  const language = usePreferencesStore(selectLanguage)
  return (
    <li className="space-y-2 rounded-lg border p-4">
      <div className="flex items-start gap-3">
        <Avatar className="size-9">
          <AvatarFallback>{review.authorName.slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-medium">{review.authorName}</span>
            {verified ? (
              <Badge variant="secondary" className="gap-1">
                <BadgeCheck className="size-3.5" />
                {t('reviews.verified')}
              </Badge>
            ) : null}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RatingStars rating={review.rating} />
            <span className="sr-only">{t('products.rating', { rating: review.rating })}</span>
            <time dateTime={review.date}>{formatDate(review.date, language)}</time>
          </div>
        </div>
        <div className="flex gap-1">
          {canEdit ? (
            <Button variant="ghost" size="icon-sm" aria-label={t('reviews.edit')} onClick={onEdit}>
              <Pencil className="size-4" />
            </Button>
          ) : null}
          {canDelete ? (
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button variant="ghost" size="icon-sm" aria-label={t('reviews.delete.action')} />
                }
              >
                <Trash2 className="size-4" />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('reviews.delete.title')}</AlertDialogTitle>
                  <AlertDialogDescription>{t('reviews.delete.body')}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('reviews.delete.cancel')}</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={onDelete}>
                    {t('reviews.delete.confirm')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </div>
      </div>
      <p className="text-sm">{review.comment}</p>
    </li>
  )
}
