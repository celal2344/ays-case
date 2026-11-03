import { Minus, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/** Quantity between 1 and `max`; typed values are clamped. */
export function QuantityStepper({
  value,
  max,
  onChange,
}: {
  value: number
  max: number
  onChange: (value: number) => void
}) {
  const { t } = useTranslation()
  const clamp = (n: number) => Math.min(Math.max(1, Math.trunc(n) || 1), Math.max(1, max))
  return (
    <div
      className="inline-flex items-center gap-1"
      role="group"
      aria-label={t('products.quantity')}
    >
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={t('products.quantityDecrease')}
        disabled={value <= 1}
        onClick={() => onChange(clamp(value - 1))}
      >
        <Minus className="size-4" />
      </Button>
      <Input
        inputMode="numeric"
        aria-label={t('products.quantity')}
        className="w-14 text-center"
        value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value.replace(/\D/g, ''))))}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={t('products.quantityIncrease')}
        disabled={value >= max}
        onClick={() => onChange(clamp(value + 1))}
      >
        <Plus className="size-4" />
      </Button>
    </div>
  )
}
