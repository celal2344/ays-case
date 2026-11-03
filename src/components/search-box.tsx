import { Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Input } from '@/components/ui/input'
import { useDebouncedValue } from '@/lib/use-debounced-value'

/** Search input that reports its value 300 ms after typing pauses, and follows external changes (URL, Clear filters). */
export function SearchBox({
  value,
  onCommit,
  placeholder,
  label,
}: {
  value: string
  onCommit: (value: string) => void
  placeholder?: string
  label?: string
}) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState(value)
  const debounced = useDebouncedValue(draft, 300)
  const committed = useRef(value)

  // draft → URL, once typing pauses
  useEffect(() => {
    if (debounced !== committed.current) {
      committed.current = debounced
      onCommit(debounced)
    }
  }, [debounced, onCommit])

  // URL → draft, when the URL changed from elsewhere
  useEffect(() => {
    if (value !== committed.current) {
      committed.current = value
      setDraft(value)
    }
  }, [value])

  return (
    <div className="relative min-w-0 flex-1 sm:max-w-xs">
      <Search
        className="pointer-events-none absolute top-2 left-2.5 size-4 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        type="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder ?? t('products.search.placeholder')}
        aria-label={label ?? t('products.search.label')}
        className="pl-8"
      />
    </div>
  )
}
