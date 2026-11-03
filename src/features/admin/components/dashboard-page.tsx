import { Link } from '@tanstack/react-router'
import { PackageX, Pencil, Plus, RotateCcw, TriangleAlert, Package } from 'lucide-react'
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
  const { products, isPending, isError, refetch } = useCatalog()
  const created = useProductOverlayStore((s) => s.created)
  const patched = useProductOverlayStore((s) => s.patched)
  const deleted = useProductOverlayStore((s) => s.deleted)

  if (isError) return <ErrorState onRetry={() => void refetch()} />
  if (isPending || !products) return <PageSkeleton />

  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD).length
  const outOfStock = products.filter((p) => p.stock <= 0).length
  const localChanges = Object.keys(created).length + Object.keys(patched).length + deleted.length

  const reset = () => {
    resetDemoData()
    toast.success(t('admin.dashboard.resetDone'))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{t('admin.title')}</h1>
        <div className="flex gap-2">
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={<Package className="size-4" />}
          label={t('admin.dashboard.total')}
          value={products.length}
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
