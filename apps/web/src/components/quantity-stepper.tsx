import { Minus, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/**
 * Quantity between 1 and `max`; typed values are clamped, and the field may be empty while typing.
 * With `onRemove` (a line already in the cart) the "−" button turns into a trash button at quantity 1.
 */
export function QuantityStepper({
  value,
  max,
  onChange,
  onRemove,
}: {
  value: number
  max: number
  onChange: (value: number) => void
  onRemove?: () => void
}) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState<string | null>(null)
  const clamp = (n: number) => Math.min(Math.max(1, Math.trunc(n) || 1), Math.max(1, max))
  return (
    <div
      className="inline-flex items-center gap-1"
      role="group"
      aria-label={t('products.quantity')}
    >
      {onRemove && value <= 1 ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={t('cart.removeFromCart')}
          onClick={onRemove}
        >
          <Trash2 className="size-4" />
        </Button>
      ) : (
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
      )}
      <Input
        inputMode="numeric"
        aria-label={t('products.quantity')}
        className="w-14 text-center"
        value={draft ?? value}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, '')
          if (digits === '') return setDraft('')
          const next = clamp(Number(digits))
          setDraft(String(next))
          onChange(next)
        }}
        onBlur={() => setDraft(null)}
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
