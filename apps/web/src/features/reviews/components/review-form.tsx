import { useForm } from '@tanstack/react-form'
import { useTranslation } from 'react-i18next'

import { PendingButton } from '@/components/pending-button'
import { runExclusive } from '@/lib/in-flight'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

import { REVIEW_MAX_LENGTH, REVIEW_MIN_LENGTH, reviewFormSchema } from '../schemas'
import { useReviewMutations } from '../hooks/use-review-mutations'
import { StarInput } from './rating-stars'

export function ReviewForm({
  productId,
  editing,
  onDone,
}: {
  productId: number
  /** Present when editing the user's existing review. */
  editing?: { id: number; rating: number; comment: string }
  onDone: () => void
}) {
  const { t } = useTranslation()
  const { create, update } = useReviewMutations(productId)
  const mutation = editing ? update : create

  const form = useForm({
    defaultValues: { rating: editing?.rating ?? 0, comment: editing?.comment ?? '' },
    validators: { onSubmit: reviewFormSchema },
    onSubmit: ({ value }) =>
      runExclusive(`form:review:${editing?.id ?? 'new'}`, async () => {
        try {
          if (editing) await update.mutateAsync({ id: editing.id, ...value })
          else await create.mutateAsync(value)
        } catch {
          return // the reason was shown as a message
        }
        form.reset()
        onDone()
      }),
  })

  return (
    <form
      className="space-y-4 rounded-lg border p-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <h3 className="font-medium">
        {t(editing ? 'reviews.form.editTitle' : 'reviews.form.title')}
      </h3>

      <form.Field name="rating">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="review-rating">{t('reviews.form.rating')}</Label>
            <div>
              <StarInput
                id="review-rating"
                value={field.state.value}
                onChange={field.handleChange}
              />
            </div>
            {field.state.meta.errors.length > 0 ? (
              <p role="alert" className="text-sm text-destructive">
                {t('reviews.form.ratingRequired')}
              </p>
            ) : null}
          </div>
        )}
      </form.Field>

      <form.Field name="comment">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="review-comment">{t('reviews.form.comment')}</Label>
            <Textarea
              id="review-comment"
              rows={4}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              aria-invalid={field.state.meta.errors.length > 0}
            />
            {field.state.meta.errors.length > 0 ? (
              <p role="alert" className="text-sm text-destructive">
                {t('reviews.form.commentLength', {
                  min: REVIEW_MIN_LENGTH,
                  max: REVIEW_MAX_LENGTH,
                })}
              </p>
            ) : null}
          </div>
        )}
      </form.Field>

      <div className="flex gap-2">
        <PendingButton type="submit" pending={mutation.isPending}>
          {t(editing ? 'reviews.form.save' : 'reviews.form.submit')}
        </PendingButton>
        {editing ? (
          <Button type="button" variant="outline" onClick={onDone}>
            {t('reviews.form.cancel')}
          </Button>
        ) : null}
      </div>
    </form>
  )
}
