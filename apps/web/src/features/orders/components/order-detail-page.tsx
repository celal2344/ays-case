import { Link, getRouteApi } from '@tanstack/react-router'
import { CircleCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { ErrorState, NotFound, PageSkeleton } from '@/components/feedback/feedback'
import { Money } from '@/components/money'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProductImage } from '@/features/products/components/product-image'
import { ProductLink } from '@/features/products/components/product-link'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { selectLanguage, usePreferencesStore } from '@/preferences/store'

import { useOrder } from '../hooks/use-orders'
import { CheckoutSteps } from './checkout-steps'
import { TotalsList } from './order-totals'

const route = getRouteApi('/_auth/orders/$orderId')

export function OrderDetailPage() {
  const { t } = useTranslation()
  const language = usePreferencesStore(selectLanguage)
  const { orderId } = route.useParams()
  const { placed } = route.useSearch()
  const { order, isPending, notFound, refetch } = useOrder(orderId)

  if (isPending) return <PageSkeleton />
  // someone else's order id is indistinguishable from one that does not exist
  if (notFound) return <NotFound />
  if (!order) return <ErrorState onRetry={() => void refetch()} />

  return (
    <div className="space-y-4">
      {placed ? <CheckoutSteps current={3} /> : null}
      {placed ? (
        <div
          role="status"
          className="flex items-start gap-3 rounded-lg border border-success/40 bg-success/10 p-4"
        >
          <CircleCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
          <div>
            <p className="font-medium">{t('orders.placed.title')}</p>
            <p className="text-sm text-muted-foreground">{t('orders.placed.body')}</p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold">
          {t('orders.number', { id: order.id.slice(0, 8).toUpperCase() })}
        </h1>
        <p className="text-sm text-muted-foreground">{formatDate(order.createdAt, language)}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <ul className="space-y-3">
          {order.lines.map((line, index) => (
            <li
              key={`${index}-${line.productId}`}
              className={cn(
                'flex gap-3 rounded-lg border p-3',
                line.productId !== null && 'card-surface',
              )}
            >
              <ProductImage src={line.thumbnail} alt="" className="size-16 shrink-0 rounded-md" />
              <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  {line.productId === null ? (
                    <p className="line-clamp-2 font-medium">{line.title}</p>
                  ) : (
                    <ProductLink productId={line.productId} className="line-clamp-2 font-medium">
                      {line.title}
                    </ProductLink>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {t('orders.line', { n: line.quantity })} · <Money cents={line.unitCents} />
                  </p>
                </div>
                <p className="font-semibold">
                  <Money cents={line.unitCents * line.quantity} />
                </p>
              </div>
            </li>
          ))}
        </ul>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('cart.summary.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <TotalsList totals={order.totals} testId="order-total" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t('checkout.shipping')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0.5 text-sm">
              <p className="font-medium">{order.shipping.fullName}</p>
              <p>{order.shipping.address}</p>
              <p>{order.shipping.city}</p>
              <p className="text-muted-foreground">{order.shipping.phone}</p>
            </CardContent>
          </Card>
          <Link
            to="/orders"
            className={buttonVariants({ variant: 'outline', className: 'w-full' })}
          >
            {t('orders.back')}
          </Link>
        </div>
      </div>
    </div>
  )
}
