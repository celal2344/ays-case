import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/_auth/orders/')({
  component: OrdersPlaceholder,
})

// Replaced by the real order history in G6.
function OrdersPlaceholder() {
  const { t } = useTranslation()
  return <h1 className="text-2xl font-semibold">{t('orders.title')}</h1>
}
