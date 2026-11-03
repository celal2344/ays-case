import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/format'
import { selectLanguage, usePreferencesStore } from '@/preferences/store'

import { categoryLabel } from '../category'
import type { Category, ProductSearch } from '../schemas'
import { activeFilters, withoutFilter, type FilterKey } from '../search-state'

/** One removable chip per active filter, plus "Clear all" when there is more than one. */
export function ActiveFilters({
  search,
  categories,
  onChange,
}: {
  search: ProductSearch
  categories: Category[]
  onChange: (change: Partial<ProductSearch>) => void
}) {
  const { t } = useTranslation()
  const language = usePreferencesStore(selectLanguage)
  const keys = activeFilters(search)
  if (keys.length === 0) return null

  const money = (n: number) => formatPrice(n, language)
  const label = (key: FilterKey): string => {
    switch (key) {
      case 'q':
        return t('products.filters.chip.q', { q: search.q?.trim() })
      case 'category': {
        const slug = search.category ?? ''
        const name = categories.find((c) => c.slug === slug)?.name ?? categoryLabel(slug)
        return t('products.filters.chip.category', { name })
      }
      case 'group':
        return t('products.filters.chip.group', {
          name: t(`nav.groups.${search.group ?? 'other'}`),
        })
      case 'price':
        if (search.minPrice !== undefined && search.maxPrice !== undefined) {
          return t('products.filters.chip.priceBetween', {
            min: money(search.minPrice),
            max: money(search.maxPrice),
          })
        }
        return search.minPrice !== undefined
          ? t('products.filters.chip.priceFrom', { min: money(search.minPrice) })
          : t('products.filters.chip.priceTo', { max: money(search.maxPrice ?? 0) })
      case 'brand':
        return t('products.filters.chip.brand', { brand: search.brand })
      case 'rating':
        return t('products.filters.chip.rating', { n: search.rating })
    }
  }

  return (
    <ul className="flex flex-wrap items-center gap-2" aria-label={t('products.filters.active')}>
      {keys.map((key) => (
        <li key={key}>
          <Button
            variant="secondary"
            size="sm"
            className="rounded-full"
            aria-label={t('products.filters.remove', { label: label(key) })}
            onClick={() => onChange(withoutFilter(key))}
          >
            {label(key)}
            <X className="size-3.5" aria-hidden="true" />
          </Button>
        </li>
      ))}
      {keys.length > 1 ? (
        <li>
          <Button variant="ghost" size="sm" onClick={() => onChange(withoutFilter())}>
            {t('products.filters.clearAll')}
          </Button>
        </li>
      ) : null}
    </ul>
  )
}
