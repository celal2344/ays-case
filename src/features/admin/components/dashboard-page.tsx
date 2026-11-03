import { Link } from '@tanstack/react-router'
import {
  Package,
  PackageX,
  Pencil,
  Plus,
  Receipt,
  RotateCcw,
  TriangleAlert,
  Users,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ErrorState, PageSkeleton } from '@/components/feedback/feedback'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCatalog } from '@/features/products/hooks/use-catalog'
import { LOW_STOCK_THRESHOLD } from '@/features/products/pricing'
import { useProductOverlayStore } from '@/features/products/overlay-store'
import { useOrdersStore } from '@/features/orders/store'
import { useUserOverlayStore } from '@/features/users/overlay-store'
import { useUsers } from '@/features/users/hooks/use-users'

import { resetDemoData } from '../reset'

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
  const catalog = useCatalog()
  const userList = useUsers()
  const { products } = catalog
  const isError = catalog.isError || userList.isError
  const isPending = catalog.isPending || userList.isPending
  const created = useProductOverlayStore((s) => s.created)
  const patched = useProductOverlayStore((s) => s.patched)
  const deleted = useProductOverlayStore((s) => s.deleted)
  const orderCount = useOrdersStore((s) => s.orders.length)
  const userChanges = useUserOverlayStore(
    (s) => Object.keys(s.created).length + Object.keys(s.patched).length + s.deleted.length,
  )

  if (isError)
    return (
      <ErrorState
        onRetry={() => {
          void catalog.refetch()
          void userList.refetch()
        }}
      />
    )
  if (isPending || !products) return <PageSkeleton />

  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD).length
  const outOfStock = products.filter((p) => p.stock <= 0).length
  const localChanges =
    Object.keys(created).length + Object.keys(patched).length + deleted.length + userChanges

  const reset = () => {
    resetDemoData()
    toast.success(t('admin.dashboard.resetDone'))
  }

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
          value={products.length}
        />
        <Stat
          icon={<Users className="size-4" />}
          label={t('admin.dashboard.users')}
          value={userList.users?.length ?? 0}
        />
        <Stat
          icon={<TriangleAlert className="size-4" />}
          label={t('admin.dashboard.low', { max: LOW_STOCK_THRESHOLD })}
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
        <Stat
          icon={<Pencil className="size-4" />}
          label={t('admin.dashboard.changes')}
          value={localChanges}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('admin.dashboard.demoData')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-xl text-sm text-muted-foreground">{t('admin.dashboard.resetBody')}</p>
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="destructive" />}>
              <RotateCcw className="size-4" />
              {t('admin.dashboard.reset')}
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('admin.dashboard.confirm.title')}</AlertDialogTitle>
                <AlertDialogDescription>{t('admin.dashboard.confirm.body')}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('admin.dashboard.confirm.cancel')}</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={reset}>
                  {t('admin.dashboard.confirm.confirm')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  )
}
