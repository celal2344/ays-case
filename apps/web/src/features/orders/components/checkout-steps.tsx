import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

const STEPS = ['cart', 'details', 'confirm'] as const

/**
 * Cart → Details → Confirm in a sticky glass bar. `current` is 1-based; earlier steps show a check
 * mark, the current one is a white pill with an orange number.
 */
export function CheckoutSteps({ current }: { current: 1 | 2 | 3 }) {
  const { t } = useTranslation()
  return (
    <ol
      aria-label={t('checkout.steps.label')}
      className="glass sticky top-[calc(var(--header-h)+0.5rem)] z-30 m-0 flex w-fit max-w-full list-none flex-wrap items-center gap-2 rounded-[18px] p-2.5 text-sm"
    >
      {STEPS.map((step, index) => {
        const number = index + 1
        const done = number < current || (current === 3 && number === 3)
        const active = number === current && !done
        return (
          <li key={step} className="contents">
            <span
              aria-current={active ? 'step' : undefined}
              className={cn(
                'flex items-center gap-2.5 rounded-xl py-2 pr-3.5 pl-2 font-semibold',
                done && 'text-success',
                active &&
                  'bg-card font-bold text-primary shadow-[0_4px_12px_-6px_rgba(194,65,12,0.4)]',
                !done && !active && 'text-muted-foreground',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'flex size-7 items-center justify-center rounded-full text-[13px]',
                  done && 'bg-green-100 dark:bg-green-500/20',
                  active && 'bg-primary text-primary-foreground',
                  !done && !active && 'border bg-muted',
                )}
              >
                {done ? <Check className="size-4" /> : number}
              </span>
              {t(`checkout.steps.${step}`)}
            </span>
            {number < STEPS.length ? (
              <span
                aria-hidden="true"
                className={cn(
                  'h-0.5 w-8 rounded-full',
                  number < current ? 'bg-green-300 dark:bg-green-500/40' : 'bg-border',
                )}
              />
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}
