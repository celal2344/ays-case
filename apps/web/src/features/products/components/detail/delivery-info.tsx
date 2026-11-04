import { RotateCcw, ShieldCheck, Truck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { ProductDetail } from '../../schemas'

/** Shipping, return and warranty lines under the price box; only what the product actually has. */
export function DeliveryInfo({ product }: { product: ProductDetail }) {
  const { t } = useTranslation()
  const rows = [
    { icon: Truck, label: t('products.specs.shipping'), value: product.shipping?.label },
    { icon: RotateCcw, label: t('products.specs.returns'), value: product.returnPolicy?.label },
    { icon: ShieldCheck, label: t('products.specs.warranty'), value: product.warranty?.label },
  ].filter((row) => row.value)
  if (rows.length === 0) return null

  return (
    <ul className="space-y-2 rounded-lg border bg-card p-4 text-sm">
      {rows.map(({ icon: Icon, label, value }) => (
        <li key={label} className="flex items-start gap-3">
          <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span>
            <span className="font-medium">{label}: </span>
            <span className="text-muted-foreground">{value}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}
