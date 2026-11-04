import { useTranslation } from 'react-i18next'

import { Money } from '@/components/money'
import type { CartTotals } from '@/features/cart/selectors'

/** Subtotal / discount / total rows shared by the checkout and order pages. */
export function TotalsList({ totals, testId }: { totals: CartTotals; testId?: string }) {
  const { t } = useTranslation()
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between">
        <dt>{t('cart.summary.subtotal')}</dt>
        <dd>
          <Money cents={totals.subtotalCents} />
        </dd>
      </div>
      <div className="flex justify-between text-muted-foreground">
        <dt>{t('cart.summary.discount')}</dt>
        <dd>
          −<Money cents={totals.discountCents} />
        </dd>
      </div>
      <div className="flex justify-between border-t pt-2 text-base font-semibold">
        <dt>{t('cart.summary.total')}</dt>
        <dd data-testid={testId}>
          <Money cents={totals.totalCents} />
        </dd>
      </div>
    </dl>
  )
}
