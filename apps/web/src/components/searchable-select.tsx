import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'

export interface SelectOption {
  value: string
  label: string
}

/**
 * A select you can type into: the list filters as you type (arrows move, Enter picks). The value is the
 * option's `value`, or '' for nothing chosen; `clearable` adds the clear button for optional fields.
 */
export function SearchableSelect({
  id,
  label,
  options,
  value,
  onChange,
  placeholder,
  emptyText,
  invalid = false,
  clearable = false,
}: {
  id: string
  label: string
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder: string
  emptyText: string
  invalid?: boolean
  clearable?: boolean
}) {
  const selected = options.find((option) => option.value === value) ?? null
  return (
    <Combobox<SelectOption>
      items={options}
      value={selected}
      onValueChange={(option) => onChange(option?.value ?? '')}
      itemToStringLabel={(option) => option.label}
      isItemEqualToValue={(a, b) => a.value === b.value}
    >
      <ComboboxInput
        id={id}
        aria-label={label}
        aria-invalid={invalid || undefined}
        placeholder={placeholder}
        showClear={clearable && selected !== null}
      />
      <ComboboxContent>
        <ComboboxEmpty>{emptyText}</ComboboxEmpty>
        <ComboboxList>
          {(option: SelectOption) => (
            <ComboboxItem key={option.value} value={option}>
              {option.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
