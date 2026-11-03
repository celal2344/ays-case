import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

const STEPS = ['cart', 'details', 'confirm'] as const

/** Cart → Details → Confirm. `current` is 1-based; earlier steps show a check mark. */
export function CheckoutSteps({ current }: { current: 1 | 2 | 3 }) {
  const { t } = useTranslation()
  return (
    <ol aria-label={t('checkout.steps.label')} className="flex items-center gap-2 text-sm sm:gap-3">
      {STEPS.map((step, index) => {
        const number = index + 1
        const done = number < current || (current === 3 && number === 3)
        const active = number === current
        return (
          <li
            key={step}
            aria-current={active ? 'step' : undefined}
            className={cn(
              'flex items-center gap-2',
              active ? 'font-semibold text-foreground' : 'text-muted-foreground',
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'flex size-6 items-center justify-center rounded-full border text-xs',
                (active || done) && 'border-primary bg-primary text-primary-foreground',
              )}
            >
              {done ? <Check className="size-3.5" /> : number}
            </span>
            {t(`checkout.steps.${step}`)}
            {number < STEPS.length ? (
              <span aria-hidden="true" className="ml-1 h-px w-4 bg-border sm:w-10" />
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}
