import { Link } from '@tanstack/react-router'
import { Check, Package, Search, ShoppingBag, Star } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { EmptyState, ErrorState, PageSkeleton } from '@/components/feedback/feedback'
import { Money } from '@/components/money'
import { buttonVariants } from '@/components/ui/button'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { selectLanguage, usePreferencesStore } from '@/preferences/store'

import { useOrders } from '../hooks/use-orders'
import type { Order } from '../schemas'
import { OrderReviewDialog } from './order-review-dialog'

const MAX_THUMBNAILS = 5

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="flex flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      <strong className="text-sm tabular-nums">{children}</strong>
    </span>
  )
}

function OrderCard({ order }: { order: Order }) {
  const { t } = useTranslation()
  const language = usePreferencesStore(selectLanguage)
  const [reviewing, setReviewing] = useState(false)
  const count = order.lines.reduce((sum, l) => sum + l.quantity, 0)
  const shown = order.lines.slice(0, MAX_THUMBNAILS)
  const more = order.lines.length - shown.length
  const number = order.id.slice(0, 8).toUpperCase()
  return (
    <article className="overflow-hidden rounded-[20px] border bg-card">
      <div className="flex flex-wrap items-center gap-x-10 gap-y-3 border-b bg-muted/50 px-6 py-4">
        <Fact label={t('orders.fields.date')}>{formatDate(order.createdAt, language)}</Fact>
        <Fact label={t('orders.fields.number')}>#{number}</Fact>
        <Fact label={t('orders.fields.summary')}>{t('orders.items', { n: count })}</Fact>
        <Fact label={t('orders.fields.total')}>
          <span className="text-brand-text">
            <Money cents={order.totals.totalCents} />
          </span>
        </Fact>
        <Link
          to="/orders/$orderId"
          params={{ orderId: order.id }}
          aria-label={`${t('orders.details')}: ${t('orders.number', { id: number })}`}
          className={cn(
            buttonVariants({ size: 'lg' }),
            'ml-auto h-10 rounded-[10px] px-5 text-sm font-semibold',
          )}
        >
          {t('orders.details')}
        </Link>
      </div>
      <div className="flex flex-wrap items-center gap-5 px-6 py-5">
        <span className="flex min-w-[180px] flex-col gap-0.5">
          <span className="inline-flex items-center gap-1.5 font-semibold text-success">
            <Check className="size-[18px]" aria-hidden="true" />
            {t('orders.status.received')}
          </span>
          <span className="text-[13px] text-muted-foreground">
            {t('orders.ordered', { n: count })}
          </span>
        </span>
        <ul className="flex flex-wrap items-center gap-2.5">
          {shown.map((line, index) => (
            <li
              key={`${index}-${line.productId}`}
              className="flex size-[68px] items-center justify-center rounded-[14px] border bg-white"
            >
              {line.thumbnail ? (
                <img
                  src={line.thumbnail}
                  alt={line.title}
                  width={56}
                  height={56}
                  loading="lazy"
                  className="size-14 object-contain"
                />
              ) : (
                <Package className="size-6 text-muted-foreground" aria-hidden="true" />
              )}
            </li>
          ))}
          {more > 0 ? (
            <li className="flex size-[68px] items-center justify-center rounded-[14px] border bg-muted font-bold text-muted-foreground">
              +{more}
            </li>
          ) : null}
        </ul>
        <button
          type="button"
          onClick={() => setReviewing(true)}
          className="ml-auto inline-flex h-10 items-center gap-2 rounded-[10px] border border-orange-300 bg-orange-50 px-[18px] text-sm font-semibold text-primary transition-colors outline-none hover:bg-orange-100 focus-visible:ring-3 focus-visible:ring-ring/50 dark:border-orange-400/40 dark:bg-orange-500/10 dark:text-orange-300 dark:hover:bg-orange-500/20"
        >
          <Star className="size-4" aria-hidden="true" />
          {t('orders.review.button')}
        </button>
      </div>
      {reviewing ? (
        <OrderReviewDialog order={order} open={reviewing} onOpenChange={setReviewing} />
      ) : null}
    </article>
  )
}

export function OrdersPage() {
  const { t } = useTranslation()
  const { orders, isPending, isError, refetch } = useOrders()
  const [query, setQuery] = useState('')
  const needle = query.trim().toLocaleLowerCase()
  const visible = useMemo(
    () =>
      needle === ''
        ? orders
        : orders.filter((order) =>
            order.lines.some((line) => line.title.toLocaleLowerCase().includes(needle)),
          ),
    [orders, needle],
  )

  if (isError) return <ErrorState onRetry={() => void refetch()} />
  if (isPending) return <PageSkeleton />

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="m-0 text-[30px] font-extrabold tracking-[-0.025em]">
            {t('orders.title')}
          </h1>
          <span className="text-muted-foreground">
            {t('orders.count', { count: orders.length })}
          </span>
        </div>
        {orders.length > 0 ? (
          <label className="flex h-11 flex-[0_1_380px] items-center gap-2.5 rounded-xl border bg-card px-3.5 text-muted-foreground focus-within:ring-3 focus-within:ring-ring/50">
            <Search className="size-[18px]" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('orders.search.placeholder')}
              aria-label={t('orders.search.label')}
              className="flex-1 border-0 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
            />
          </label>
        ) : null}
      </div>
      {orders.length === 0 ? (
        <EmptyState title={t('orders.empty')}>
          <Link to="/products" className={buttonVariants({})}>
            <ShoppingBag className="size-4" />
            {t('cart.emptyCta')}
          </Link>
        </EmptyState>
      ) : (
        <>
          {visible.length === 0 ? (
            <p
              role="status"
              className="rounded-[20px] border border-dashed p-6 text-muted-foreground"
            >
              {t('orders.search.none', { q: query.trim() })}
            </p>
          ) : (
            <ul className="flex flex-col gap-5">
              {visible.map((order) => (
                <li key={order.id}>
                  <OrderCard order={order} />
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-center gap-4 rounded-[20px] border border-dashed px-6 py-5 text-muted-foreground">
            <Package className="size-5" aria-hidden="true" />
            <span>{t('orders.note')}</span>
            <Link to="/products" className="ml-auto font-semibold text-brand-text hover:underline">
              {t('orders.continue')}
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
