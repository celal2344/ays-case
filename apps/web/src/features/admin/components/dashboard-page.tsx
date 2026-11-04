import { Link } from '@tanstack/react-router'
import { Package, PackageX, Plus, Receipt, TriangleAlert, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { ErrorState, PageSkeleton } from '@/components/feedback/feedback'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useOrders } from '@/features/orders/hooks/use-orders'
import { useAdminProducts } from '@/features/products/hooks/use-admin-products'
import { useUsers } from '@/features/users/hooks/use-users'

import { LOOKUP_KINDS } from '../lookups'

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <Card size="sm">
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <span className="text-muted-foreground" aria-hidden="true">
          {icon}
        </span>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tabular-nums">{value}</p>
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
  const lowStock = active.filter((p) => p.availability === 'low').length
  const outOfStock = active.filter((p) => p.availability === 'out').length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{t('admin.title')}</h1>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/users" className={buttonVariants({ variant: 'outline' })}>
            <Users className="size-4" />
            {t('admin.dashboard.manageUsers')}
          </Link>
          <Link to="/admin/products" className={buttonVariants({ variant: 'outline' })}>
            <Package className="size-4" />
            {t('admin.dashboard.manageProducts')}
          </Link>
          <Link to="/admin/products/new" className={buttonVariants({})}>
            <Plus className="size-4" />
            {t('admin.products.new')}
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Stat
          icon={<Package className="size-4" />}
          label={t('admin.dashboard.total')}
          value={active.length}
        />
        <Stat
          icon={<Users className="size-4" />}
          label={t('admin.dashboard.users')}
          value={userList.users?.length ?? 0}
        />
        <Stat
          icon={<TriangleAlert className="size-4" />}
          label={t('admin.dashboard.low')}
          value={lowStock}
        />
        <Stat
          icon={<PackageX className="size-4" />}
          label={t('admin.dashboard.out')}
          value={outOfStock}
        />
        <Stat
          icon={<Receipt className="size-4" />}
          label={t('admin.dashboard.orders')}
          value={orderCount}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('admin.lookups.title')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {LOOKUP_KINDS.map((kind) => (
            <Link
              key={kind.id}
              to="/admin/lookups/$kind"
              params={{ kind: kind.id }}
              className={buttonVariants({ variant: 'outline' })}
            >
              {t(`admin.lookups.kinds.${kind.id}`)}
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
