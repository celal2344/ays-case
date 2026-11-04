import type { ParseKeys } from 'i18next'
import { useTranslation } from 'react-i18next'

/** First validation error of a TanStack Form field. Schema messages are i18n keys. */
export function FieldError({ errors }: { errors: unknown[] }) {
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
      {t(key as ParseKeys)}
    </p>
  )
}
