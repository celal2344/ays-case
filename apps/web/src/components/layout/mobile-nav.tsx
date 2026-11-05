import { Link } from '@tanstack/react-router'
import { Heart, LayoutDashboard, Store, LogIn, Menu, Package } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { selectUser, useAuthStore } from '@/features/auth/store'

import { CategoryAccordion } from './category-accordion'
import { PreferencesControls } from './preferences-controls'

const ROW =
  'flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm font-medium hover:bg-accent [&_svg]:size-[18px] [&_svg]:text-muted-foreground'

function NavLink({
  to,
  onNavigate,
  children,
}: {
  to: '/products' | '/orders' | '/favorites' | '/admin' | '/login'
  onNavigate: () => void
  children: ReactNode
}) {
  return (
    <Link to={to} onClick={onNavigate} className={ROW} activeProps={{ className: 'bg-accent' }}>
      {children}
    </Link>
  )
}

export function MobileNav() {
  const { t } = useTranslation()
  const user = useAuthStore(selectUser)
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            className="size-11 rounded-xl lg:hidden"
            aria-label={t('nav.menu')}
          />
        }
      >
        <Menu className="size-[18px]" />
      </SheetTrigger>
      <SheetContent side="left" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('app.name')}</SheetTitle>
        </SheetHeader>
        {user ? (
          <div className="mx-4 flex items-center gap-3 rounded-xl bg-orange-50 p-3 dark:bg-orange-500/10">
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-primary dark:bg-orange-500/20 dark:text-orange-300"
            >
              {`${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-semibold">
                {user.firstName} {user.lastName}
              </span>
              <span className="truncate text-xs text-muted-foreground">@{user.username}</span>
            </span>
            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
              {t(`userMenu.role.${user.role}`)}
            </Badge>
          </div>
        ) : null}
        <nav aria-label={t('nav.main')} className="flex flex-col gap-0.5 px-4">
          {user ? (
            <>
              <NavLink to="/orders" onNavigate={close}>
                <Package aria-hidden="true" />
                {t('nav.myOrders')}
              </NavLink>
              <NavLink to="/favorites" onNavigate={close}>
                <Heart aria-hidden="true" />
                {t('favorites.title')}
              </NavLink>
              {user.role === 'admin' ? (
                <NavLink to="/admin" onNavigate={close}>
                  <LayoutDashboard aria-hidden="true" />
                  {t('nav.adminPanel')}
                </NavLink>
              ) : null}
            </>
          ) : (
            <NavLink to="/login" onNavigate={close}>
              <LogIn aria-hidden="true" />
              {t('nav.login')}
            </NavLink>
          )}
          <NavLink to="/products" onNavigate={close}>
            <Store aria-hidden="true" />
            {t('nav.allProducts')}
          </NavLink>
        </nav>
        <CategoryAccordion onNavigate={close} />
        <div className="mt-auto px-4 pb-4">
          <PreferencesControls />
        </div>
      </SheetContent>
    </Sheet>
  )
}
