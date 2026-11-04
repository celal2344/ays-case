import { useTranslation } from 'react-i18next'

import { categoryLabel } from '../../category'
import type { ProductDetail } from '../../schemas'

/** Attribute grid; local products only show the fields they actually have. */
export function Specs({ product }: { product: ProductDetail }) {
  const { t } = useTranslation()
  const { dimensions } = product
  const rows: [string, string | undefined][] = [
    [t('products.specs.brand'), product.brand],
    [t('products.specs.category'), categoryLabel(product.category)],
    [t('products.specs.sku'), product.sku],
    [t('products.specs.warranty'), product.warrantyInformation],
    [t('products.specs.shipping'), product.shippingInformation],
    [t('products.specs.returns'), product.returnPolicy],
    [
      t('products.specs.dimensions'),
      dimensions
        ? `${dimensions.width} × ${dimensions.height} × ${dimensions.depth} cm`
        : undefined,
    ],
    [t('products.specs.weight'), product.weight === undefined ? undefined : `${product.weight} kg`],
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
