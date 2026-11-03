import { formatPrice } from '@/lib/format'
import { selectLanguage, usePreferencesStore } from '@/preferences/store'

/** Money held in integer cents, shown in the current language's format. */
export function Money({ cents }: { cents: number }) {
  const language = usePreferencesStore(selectLanguage)
  return <>{formatPrice(cents / 100, language)}</>
}
