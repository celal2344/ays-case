import type { TFunction } from 'i18next'

import { errorMessageKey } from '@/lib/error-message'
import type { AppError } from '@/lib/http-error'

/** One readable sentence for a failed user action: the API's error code, else the generic kind. */
export function userErrorText(t: TFunction, error: AppError): string {
  switch (error.code) {
    case 'cannot_delete_self':
    case 'cannot_demote_self':
      return t('admin.users.guard.self')
    case 'last_admin':
      return t('admin.users.guard.last-admin')
    case 'duplicate':
      return t('admin.users.errors.duplicate')
    default:
      return t(errorMessageKey(error))
  }
}
