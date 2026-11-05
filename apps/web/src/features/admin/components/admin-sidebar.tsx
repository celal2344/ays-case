import { Link } from '@tanstack/react-router'
import {
  Boxes,
  Building2,
  ChevronsLeft,
  ChevronsRight,
  LayoutDashboard,
  Menu,
  Package,
  RotateCcw,
  ShieldCheck,
  Tags,
  Truck,
  Users,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useAdminProducts } from '@/features/products/hooks/use-admin-products'
import { readJson, storageKey, writeJson } from '@/lib/storage'
import { cn } from '@/lib/utils'

import type { LookupKind } from '../lookups'

const COLLAPSED_KEY = storageKey('admin-sidebar-collapsed')
const icon = 'size-4 shrink-0'

type GroupId = 'general' | 'catalog' | 'policies' | 'users'
type ItemId =
  | 'dashboard'
  | 'products'
  | 'categories'
  | 'brands'
  | 'tags'
  | 'warranty'
  | 'shipping'
  | 'returns'
  | 'users'
type Entry = { id: ItemId; to: string; kind?: LookupKind; icon: ReactNode }

/** The sidebar's groups, in the order the owner asked for. */
const GROUPS: { id: GroupId; entries: Entry[] }[] = [
  {
    id: 'general',
    entries: [{ id: 'dashboard', to: '/admin', icon: <LayoutDashboard className={icon} /> }],
  },
  {
    id: 'catalog',
    entries: [
      { id: 'products', to: '/admin/products', icon: <Package className={icon} /> },
      {
        id: 'categories',
        to: '/admin/lookups/$kind',
        kind: 'categories',
        icon: <Boxes className={icon} />,
      },
      {
        id: 'brands',
        to: '/admin/lookups/$kind',
        kind: 'brands',
        icon: <Building2 className={icon} />,
      },
      { id: 'tags', to: '/admin/lookups/$kind', kind: 'tags', icon: <Tags className={icon} /> },
    ],
  },
  {
    id: 'policies',
    entries: [
      {
        id: 'warranty',
        to: '/admin/lookups/$kind',
        kind: 'warranty-policies',
        icon: <ShieldCheck className={icon} />,
      },
      {
        id: 'shipping',
        to: '/admin/lookups/$kind',
        kind: 'shipping-policies',
        icon: <Truck className={icon} />,
      },
      {
        id: 'returns',
        to: '/admin/lookups/$kind',
        kind: 'return-policies',
        icon: <RotateCcw className={icon} />,
      },
    ],
  },
  { id: 'users', entries: [{ id: 'users', to: '/admin/users', icon: <Users className={icon} /> }] },
]

function useLowStockCount() {
  const { products } = useAdminProducts()
  return (products ?? []).filter((p) => p.deletedAt === null && p.availability === 'low').length
}

function SidebarLinks({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { t } = useTranslation()
  const lowStock = useLowStockCount()
  return (
    <nav aria-label={t('admin.sidebar.label')} className="space-y-4">
      {GROUPS.map((group) => (
        <div key={group.id} className="space-y-1">
          {collapsed ? null : (
            <p className="px-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {t(`admin.sidebar.groups.${group.id}`)}
            </p>
          )}
          {group.entries.map((entry) => {
            const label = t(`admin.sidebar.items.${entry.id}`)
            const badge = entry.id === 'products' && lowStock > 0 ? lowStock : null
            const className =
              'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted'
            const content = (
              <>
                {entry.icon}
                <span className={cn('truncate', collapsed && 'sr-only')}>{label}</span>
                {badge !== null && !collapsed ? (
                  <Badge
                    variant="secondary"
                    className="ml-auto"
                    aria-label={t('admin.sidebar.lowStock', { count: badge })}
                  >
                    {badge}
                  </Badge>
                ) : null}
              </>
            )
            const active = 'bg-muted font-medium text-foreground'
            return entry.kind ? (
              <Link
                key={entry.id}
                to="/admin/lookups/$kind"
                params={{ kind: entry.kind }}
                title={label}
                className={cn(className, 'text-muted-foreground')}
                activeProps={{ className: active, 'aria-current': 'page' }}
                onClick={onNavigate}
              >
                {content}
              </Link>
            ) : (
              <Link
                key={entry.id}
                to={entry.to}
                title={label}
                activeOptions={{ exact: entry.to === '/admin' }}
                className={cn(className, 'text-muted-foreground')}
                activeProps={{ className: active, 'aria-current': 'page' }}
                onClick={onNavigate}
              >
                {content}
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}

/**
 * The admin sidebar: sticky under the header, collapsible to icons on desktop, a drawer on small
 * screens. It lives in the admin layout route, so it stays mounted while moving between admin pages.
 */
export function AdminSidebar() {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(() => readJson<boolean>(COLLAPSED_KEY, false))
  const [open, setOpen] = useState(false)
  const toggle = () => {
    writeJson(COLLAPSED_KEY, !collapsed)
    setCollapsed(!collapsed)
  }

  return (
    <>
      <aside
        data-testid="admin-sidebar"
        className={cn(
          'sticky top-[var(--header-h,0px)] hidden max-h-[calc(100svh-var(--header-h,0px))] shrink-0 self-start overflow-y-auto border-r py-4 pr-3 md:block',
          collapsed ? 'w-14' : 'w-56',
        )}
      >
        <SidebarLinks collapsed={collapsed} />
        <Button
          variant="ghost"
          size="sm"
          className="mt-4 w-full justify-start text-muted-foreground"
          aria-label={t(collapsed ? 'admin.sidebar.expand' : 'admin.sidebar.collapse')}
          onClick={toggle}
        >
          {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
          {collapsed ? null : t('admin.sidebar.collapse')}
        </Button>
      </aside>

      <div className="md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger render={<Button variant="outline" size="sm" />}>
            <Menu className="size-4" />
            {t('admin.sidebar.open')}
          </SheetTrigger>
          <SheetContent side="left">
            <SheetHeader>
              <SheetTitle>{t('admin.title')}</SheetTitle>
            </SheetHeader>
            <div className="overflow-y-auto px-4 pb-4">
              <SidebarLinks collapsed={false} onNavigate={() => setOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}
