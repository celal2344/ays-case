import { LayoutGrid, Rows3, SlidersHorizontal } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

import type { Category, ProductSearch } from '../schemas'
import {
  activeFilters,
  fromSortOption,
  SORT_OPTIONS,
  toSortOption,
  type SortOption,
} from '../search-state'
import { FilterPanel } from './filter-panel'

/** Result count, sort, view toggle and (below lg) the button that opens the filters sheet. */
export function ProductToolbar({
  search,
  view,
  total,
  categories,
  brands,
  onChange,
}: {
  search: ProductSearch
  view: 'grid' | 'table'
  total: number | undefined
  categories: Category[]
  brands: string[]
  onChange: (change: Partial<ProductSearch>) => void
}) {
  const { t } = useTranslation()
  const sortItems = SORT_OPTIONS.map((value) => ({ value, label: t(`products.sort.${value}`) }))
  const filterCount = activeFilters(search).length

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Sheet>
        <SheetTrigger render={<Button variant="outline" className="lg:hidden" />}>
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          {t('products.filters.open')}
          {filterCount > 0 ? ` (${filterCount})` : ''}
        </SheetTrigger>
        <SheetContent side="left" className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t('products.filters.title')}</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-6">
            <FilterPanel
              search={search}
              categories={categories}
              brands={brands}
              onChange={onChange}
            />
          </div>
        </SheetContent>
      </Sheet>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {total === undefined ? '' : t('products.filters.results', { count: total })}
      </p>

      <Select
        items={sortItems}
        value={toSortOption(search.sort, search.order)}
        onValueChange={(value) => onChange(fromSortOption((value ?? 'default') as SortOption))}
      >
        <SelectTrigger aria-label={t('products.sort.label')} className="ml-auto w-44">
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
