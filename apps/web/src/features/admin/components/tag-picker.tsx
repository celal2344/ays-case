import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from '@/components/ui/combobox'

import type { LookupRow } from '../lookups-api'

interface TagOption {
  value: string
  label: string
  count: number
}

const SUGGESTIONS = 8

/**
 * Pick tags by typing: the chosen ones are removable chips, the list filters as you type (arrows, Enter,
 * and Backspace removes the last chip), and while the search is empty the most used tags that are not
 * chosen yet are one click away. `value` is the list of chosen tag ids as strings.
 */
export function TagPicker({
  tags,
  value,
  onChange,
}: {
  tags: LookupRow[]
  value: string[]
  onChange: (value: string[]) => void
}) {
  const { t } = useTranslation()
  const anchor = useComboboxAnchor()
  const [query, setQuery] = useState('')
  const options = useMemo<TagOption[]>(
    () =>
      tags.map((tag) => ({
        value: String(tag.id),
        label: tag.name ?? '',
        count: tag.productCount ?? 0,
      })),
    [tags],
  )
  const selected = options.filter((option) => value.includes(option.value))
  const popular = useMemo(
    () =>
      options
        .filter((option) => !value.includes(option.value))
        .toSorted((a, b) => b.count - a.count || a.label.localeCompare(b.label))
        .slice(0, SUGGESTIONS),
    [options, value],
  )

  return (
    <div className="space-y-3">
      <Combobox<TagOption, true>
        multiple
        autoHighlight
        items={options}
        value={selected}
        inputValue={query}
        onInputValueChange={setQuery}
        onValueChange={(next) => {
          onChange(next.map((option) => option.value))
          setQuery('')
        }}
        itemToStringLabel={(option) => option.label}
        isItemEqualToValue={(a, b) => a.value === b.value}
      >
        <ComboboxChips ref={anchor}>
          <ComboboxValue>
            {(chosen: TagOption[]) => (
              <>
                {chosen.map((option) => (
                  <ComboboxChip key={option.value} aria-label={option.label}>
                    {option.label}
                  </ComboboxChip>
                ))}
                <ComboboxChipsInput
                  aria-label={t('admin.form.tagSearch')}
                  placeholder={chosen.length === 0 ? t('admin.form.tagPlaceholder') : ''}
                />
              </>
            )}
          </ComboboxValue>
        </ComboboxChips>
        <ComboboxContent anchor={anchor}>
          <ComboboxEmpty>{t('admin.form.tagEmpty')}</ComboboxEmpty>
          <ComboboxList className="max-h-72">
            {(option: TagOption) => (
              <ComboboxItem key={option.value} value={option}>
                {option.label}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>

      {query === '' && popular.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">{t('admin.form.tagPopular')}</p>
          <div className="flex flex-wrap gap-2">
            {popular.map((option) => (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onChange([...value, option.value])}
              >
                <Plus className="size-3.5" aria-hidden="true" />
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
