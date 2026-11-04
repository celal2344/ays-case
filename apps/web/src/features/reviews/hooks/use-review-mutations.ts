import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { productKeys } from '@/features/products/query-keys'
import { errorCodeKey } from '@/lib/error-message'
import type { AppError } from '@/lib/http-error'

import { createReview, deleteReview, updateReview } from '../api'
import type { ReviewFormValues } from '../schemas'

/**
 * Create, edit and delete go to the API. The headline rating, count and histogram are computed by the
 * database, so after every change the product (and the catalog list) is refetched.
 */
export function useReviewMutations(productId: number) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: productKeys.detail(productId) }),
      queryClient.invalidateQueries({ queryKey: productKeys.catalog() }),
    ])
  const onError = (error: AppError) => toast.error(t(errorCodeKey(error)))

  const create = useMutation<unknown, AppError, ReviewFormValues>({
    mutationFn: (values) => createReview(productId, values),
    onSuccess: () => toast.success(t('reviews.form.added')),
    onError,
    onSettled: refresh,
  })
  const update = useMutation<unknown, AppError, { id: number } & ReviewFormValues>({
    mutationFn: ({ id, ...values }) => updateReview(id, values),
    onSuccess: () => toast.success(t('reviews.form.updated')),
    onError,
    onSettled: refresh,
  })
  const remove = useMutation<void, AppError, number>({
    mutationFn: deleteReview,
    onError,
    onSettled: refresh,
  })
  return { create, update, remove }
}
