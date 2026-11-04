import { useTranslation } from 'react-i18next'

import { formatDimensions, formatWeight } from '@/lib/format'
import { selectLanguage, usePreferencesStore } from '@/preferences/store'

import type { ProductDetail } from '../../schemas'

/** Attribute grid; local products only show the fields they actually have. */
export function Specs({ product }: { product: ProductDetail }) {
  const { t } = useTranslation()
  const language = usePreferencesStore(selectLanguage)
  const { widthMm, heightMm, depthMm, weightG } = product
  const rows: [string, string | null | undefined][] = [
    [t('products.specs.brand'), product.brand?.name],
    [t('products.specs.category'), product.category.name],
    [t('products.specs.sku'), product.sku],
    [t('products.specs.warranty'), product.warranty?.label],
    [t('products.specs.shipping'), product.shipping?.label],
    [t('products.specs.returns'), product.returnPolicy?.label],
    [
      t('products.specs.dimensions'),
      widthMm === null || heightMm === null || depthMm === null
        ? undefined
        : formatDimensions({ widthMm, heightMm, depthMm }, language),
    ],
    [t('products.specs.weight'), weightG === null ? undefined : formatWeight(weightG, language)],
  ]
  const present = rows.filter(([, value]) => value)

  return (
    <dl className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2">
      {present.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-4 bg-background px-4 py-2.5 text-sm">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="text-right font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
