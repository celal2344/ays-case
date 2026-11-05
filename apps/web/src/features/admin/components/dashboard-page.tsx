import { Link } from '@tanstack/react-router'
import { Package, PackageX, Pencil, Plus, Receipt, TriangleAlert, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { ErrorState, PageSkeleton } from '@/components/feedback/feedback'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useOrders } from '@/features/orders/hooks/use-orders'
import { useAdminProducts } from '@/features/products/hooks/use-admin-products'
import type { Product } from '@/features/products/schemas'
import { useUsers } from '@/features/users/hooks/use-users'

/** A stat card; the whole card is a link to the page that lists the numbers behind it. */
function Stat({
  icon,
  label,
  value,
  to,
}: {
  icon: ReactNode
  label: string
  value: number
  to: '/admin/products' | '/admin/users' | '/orders'
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs text-muted-foreground">{label}</span>{' '}
        <span className="block text-2xl font-semibold tabular-nums">{value}</span>
      </span>
    </Link>
  )
}

const LIST_SIZE = 5

/** Products that need restocking, worst first, each one click from its edit form. */
function StockList({
  title,
  products,
  tone,
}: {
  title: string
  products: Product[]
  tone: 'out' | 'low'
}) {
  const { t } = useTranslation()
  return (
    <Card size="sm">
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle>{title}</CardTitle>
        <Link to="/admin/products" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
          {t('admin.dashboard.viewProducts')}
        </Link>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('admin.dashboard.allGood')}</p>
        ) : (
          <ul className="divide-y">
            {products.slice(0, LIST_SIZE).map((product) => (
              <li key={product.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0 truncate text-sm">{product.title}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <span
                    className={
                      tone === 'out'
                        ? 'text-xs font-medium text-destructive'
                        : 'text-xs text-muted-foreground'
                    }
                  >
                    {t('admin.dashboard.left', { count: product.stock })}
                  </span>
                  <Link
                    to="/admin/products"
                    search={{ edit: product.id }}
                    aria-label={t('admin.products.edit', { title: product.title })}
                    className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
                  >
                    <Pencil className="size-4" />
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

export function DashboardPage() {
  const { t } = useTranslation()
  const catalog = useAdminProducts()
  const userList = useUsers()
  const orderCount = useOrders().orders.length

  if (catalog.isError || userList.isError) {
    return (
      <ErrorState
        onRetry={() => {
          void catalog.refetch()
          void userList.refetch()
        }}
      />
    )
  }
  if (catalog.isPending || userList.isPending || !catalog.products) return <PageSkeleton />

  const active = catalog.products.filter((p) => p.deletedAt === null)
  const low = active.filter((p) => p.availability === 'low').toSorted((a, b) => a.stock - b.stock)
  const out = active.filter((p) => p.availability === 'out')

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{t('admin.title')}</h1>
        <Link to="/admin/products" search={{ new: 1 }} className={buttonVariants({})}>
          <Plus className="size-4" />
          {t('admin.products.new')}
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-5">
        <Stat
          icon={<Package className="size-4" />}
          label={t('admin.dashboard.total')}
          to="/admin/products"
          value={active.length}
        />
        <Stat
          icon={<Users className="size-4" />}
          label={t('admin.dashboard.users')}
          to="/admin/users"
          value={userList.users?.length ?? 0}
        />
        <Stat
          icon={<TriangleAlert className="size-4" />}
          label={t('admin.dashboard.low')}
          to="/admin/products"
          value={low.length}
        />
        <Stat
          icon={<PackageX className="size-4" />}
          label={t('admin.dashboard.out')}
          to="/admin/products"
          value={out.length}
        />
        <Stat
          icon={<Receipt className="size-4" />}
          label={t('admin.dashboard.orders')}
          to="/orders"
          value={orderCount}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <StockList title={t('admin.dashboard.outList')} products={out} tone="out" />
        <StockList title={t('admin.dashboard.lowList')} products={low} tone="low" />
      </div>
    </div>
  )
}
