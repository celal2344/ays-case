import { Star } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import type { Category, ProductSearch } from '../schemas'

type Change = (change: Partial<ProductSearch>) => void

function Group({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-sm font-semibold">{legend}</legend>
      {children}
    </fieldset>
  )
}

function Choice({
  name,
  checked,
  onSelect,
  children,
}: {
  name: string
  checked: boolean
  onSelect: () => void
  children: ReactNode
}) {
  const id = useId()
  return (
    <div className="flex items-center gap-2">
      <input
        id={id}
        type="radio"
        name={name}
        checked={checked}
        onChange={onSelect}
        className="size-4 accent-primary"
      />
      <Label htmlFor={id} className="flex-1 cursor-pointer font-normal">
        {children}
      </Label>
    </div>
  )
}

function PriceRange({ search, onChange }: { search: ProductSearch; onChange: Change }) {
  const { t } = useTranslation()
  const [min, setMin] = useState(search.minPrice?.toString() ?? '')
  const [max, setMax] = useState(search.maxPrice?.toString() ?? '')
  const [synced, setSynced] = useState({ min: search.minPrice, max: search.maxPrice })

  // the URL changed elsewhere (a chip was removed, filters cleared): follow it
  if (synced.min !== search.minPrice || synced.max !== search.maxPrice) {
    setSynced({ min: search.minPrice, max: search.maxPrice })
    setMin(search.minPrice?.toString() ?? '')
    setMax(search.maxPrice?.toString() ?? '')
  }

  const toNumber = (value: string) => {
    const n = Number(value)
    return value.trim() !== '' && Number.isFinite(n) && n >= 0 ? n : undefined
  }

  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault()
        let lo = toNumber(min)
        let hi = toNumber(max)
        if (lo !== undefined && hi !== undefined && lo > hi) [lo, hi] = [hi, lo]
        onChange({ minPrice: lo, maxPrice: hi })
      }}
    >
      <div className="flex items-center gap-2">
        <Input
          type="number"
          inputMode="decimal"
          min={0}
          value={min}
          onChange={(e) => setMin(e.target.value)}
          placeholder={t('products.filters.min')}
          aria-label={t('products.filters.minLabel')}
        />
        <span aria-hidden="true">–</span>
        <Input
          type="number"
          inputMode="decimal"
          min={0}
          value={max}
          onChange={(e) => setMax(e.target.value)}
          placeholder={t('products.filters.max')}
          aria-label={t('products.filters.maxLabel')}
        />
      </div>
      <Button type="submit" variant="outline" size="sm" className="w-full">
        {t('products.filters.apply')}
      </Button>
    </form>
  )
}

/** Category, price, brand and rating filters. Every change goes to the URL via `onChange`. */
export function FilterPanel({
  search,
  categories,
  brands,
  onChange,
}: {
  search: ProductSearch
  categories: Category[]
  brands: string[]
  onChange: Change
}) {
  const { t } = useTranslation()
  return (
    <div className="space-y-5">
      <Group legend={t('products.category.label')}>
        <Choice
          name="category"
          checked={!search.category}
          onSelect={() => onChange({ category: undefined })}
        >
          {t('products.category.all')}
        </Choice>
        <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
          {categories.map((category) => (
            <Choice
              key={category.slug}
              name="category"
              checked={search.category === category.slug}
              onSelect={() => onChange({ category: category.slug })}
            >
              {category.name}
            </Choice>
          ))}
        </div>
      </Group>

      <Group legend={t('products.filters.price')}>
        <PriceRange search={search} onChange={onChange} />
      </Group>

      {brands.length > 0 ? (
        <Group legend={t('products.filters.brand')}>
          <Choice
            name="brand"
            checked={!search.brand}
            onSelect={() => onChange({ brand: undefined })}
          >
            {t('products.filters.allBrands')}
          </Choice>
          <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
            {brands.map((brand) => (
              <Choice
                key={brand}
                name="brand"
                checked={search.brand === brand}
                onSelect={() => onChange({ brand })}
              >
                {brand}
              </Choice>
            ))}
          </div>
        </Group>
      ) : null}

      <Group legend={t('products.filters.rating')}>
        <Choice
          name="rating"
          checked={!search.rating}
          onSelect={() => onChange({ rating: undefined })}
        >
          {t('products.filters.anyRating')}
        </Choice>
        {[4, 3, 2, 1].map((n) => (
          <Choice
            key={n}
            name="rating"
            checked={search.rating === n}
            onSelect={() => onChange({ rating: n })}
          >
            <span className="inline-flex items-center gap-1">
              {t('products.filters.ratingUp', { n })}
              <Star className="size-3.5 fill-star text-star" aria-hidden="true" />
            </span>
          </Choice>
        ))}
      </Group>
    </div>
  )
}
