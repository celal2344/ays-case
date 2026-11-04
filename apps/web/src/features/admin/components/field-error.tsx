import type { ParseKeys } from 'i18next'
import { useTranslation } from 'react-i18next'

/**
 * First validation error of a TanStack Form field. Schema messages are i18n keys; with a `keyPrefix`,
 * they are short names (the shared schemas use field names) that the prefix turns into keys.
 */
export function FieldError({ errors, keyPrefix = '' }: { errors: unknown[]; keyPrefix?: string }) {
  const { t } = useTranslation()
  const first = errors[0]
  const key =
    typeof first === 'string'
      ? first
      : typeof first === 'object' && first !== null && 'message' in first
        ? String(first.message)
        : undefined
  if (!key) return null
  return (
    <p role="alert" className="text-sm text-destructive">
      {t((keyPrefix + key) as ParseKeys)}
    </p>
  )
}
