import { LayoutGrid, Rows3 } from 'lucide-react'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { SearchBox } from '@/components/search-box'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

import type { Category, ProductSearch } from '../schemas'
import { fromSortOption, SORT_OPTIONS, toSortOption, type SortOption } from '../search-state'

const ALL = 'all'

export function ProductToolbar({
  search,
  view,
  categories,
  onChange,
}: {
  search: ProductSearch
  view: 'grid' | 'table'
  categories: Category[]
  onChange: (change: Partial<ProductSearch>) => void
}) {
  const { t } = useTranslation()
  const commitQuery = useCallback((q: string) => onChange({ q }), [onChange])

  const categoryItems = [
    { value: ALL, label: t('products.category.all') },
    ...categories.map((c) => ({ value: c.slug, label: c.name })),
  ]
  const sortItems = SORT_OPTIONS.map((value) => ({ value, label: t(`products.sort.${value}`) }))

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SearchBox value={search.q ?? ''} onCommit={commitQuery} />

      <Select
        items={categoryItems}
        value={search.category ?? ALL}
        onValueChange={(value) =>
          onChange({ category: value === ALL ? undefined : (value ?? undefined) })
        }
      >
        <SelectTrigger aria-label={t('products.category.label')} className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {categoryItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        items={sortItems}
        value={toSortOption(search.sort, search.order)}
        onValueChange={(value) => onChange(fromSortOption((value ?? 'default') as SortOption))}
      >
        <SelectTrigger aria-label={t('products.sort.label')} className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {sortItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <ToggleGroup
        variant="outline"
        className="ml-auto"
        aria-label={t('products.view.label')}
        value={[view]}
        onValueChange={(next) => {
          const value = next[0]
          if (value === 'grid' || value === 'table') onChange({ view: value })
        }}
      >
        <ToggleGroupItem value="grid" aria-label={t('products.view.grid')}>
          <LayoutGrid className="size-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="table" aria-label={t('products.view.table')}>
          <Rows3 className="size-4" />
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  )
}
