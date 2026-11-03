import { Link } from '@tanstack/react-router'
import { ShoppingBag } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/feedback/feedback'
import { Money } from '@/components/money'
import { buttonVariants } from '@/components/ui/button'
import { formatDate } from '@/lib/format'
import { selectLanguage, usePreferencesStore } from '@/preferences/store'

import { useOrders } from '../hooks/use-orders'

export function OrdersPage() {
  const { t } = useTranslation()
  const language = usePreferencesStore(selectLanguage)
  const orders = useOrders()

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t('orders.title')}</h1>
      {orders.length === 0 ? (
        <EmptyState title={t('orders.empty')}>
          <Link to="/products" className={buttonVariants({})}>
            <ShoppingBag className="size-4" />
            {t('cart.emptyCta')}
          </Link>
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => {
            const count = order.lines.reduce((sum, l) => sum + l.quantity, 0)
            return (
              <li key={order.id}>
                <Link
                  to="/orders/$orderId"
                  params={{ orderId: order.id }}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 hover:bg-muted/50"
                >
                  <div>
                    <p className="font-medium">
                      {t('orders.number', { id: order.id.slice(0, 8).toUpperCase() })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(order.createdAt, language)} · {t('orders.items', { n: count })}
                    </p>
                  </div>
                  <p className="font-semibold">
                    <Money cents={order.totals.totalCents} />
                  </p>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
