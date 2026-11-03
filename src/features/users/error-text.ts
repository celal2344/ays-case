import type { ParseKeys, TFunction } from 'i18next'

import type { AppError } from '@/lib/http-error'
import { errorMessageKey } from '@/lib/error-message'

import { GuardrailError } from './hooks/use-user-mutations'

/** One readable sentence for a failed user action (guardrail, duplicate username, API error). */
export function userErrorText(t: TFunction, error: AppError): string {
  if (error instanceof GuardrailError) return t(`admin.users.guard.${error.reason}`)
  if (error.message.startsWith('admin.')) return t(error.message as ParseKeys)
  return error.kind === 'validation' ? error.message : t(errorMessageKey(error))
}
