import { Link } from '@tanstack/react-router'
import { ChevronDown, Heart, LayoutDashboard, LogOut, Package } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { useLogout } from '@/features/auth/hooks/use-logout'
import { selectUser, useAuthStore } from '@/features/auth/store'
import { cn } from '@/lib/utils'

export function UserMenu() {
  const { t } = useTranslation()
  const user = useAuthStore(selectUser)
  const status = useAuthStore((s) => s.status)
  const logout = useLogout()

  // the session is still being checked: keep the header's width and avoid a login-button flash
  if (!user && (status === 'idle' || status === 'restoring')) {
    return (
      <Skeleton
        className="h-11 w-24 rounded-xl"
        data-testid="user-menu-skeleton"
        aria-hidden="true"
      />
    )
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          to="/register"
          className="hidden h-11 items-center rounded-xl px-3 text-sm font-semibold text-foreground hover:bg-muted sm:inline-flex"
        >
          {t('nav.register')}
        </Link>
        <Link
          to="/login"
          className={cn(buttonVariants({ variant: 'outline' }), 'h-11 rounded-xl px-4')}
        >
          {t('nav.login')}
        </Link>
      </div>
    )
  }

  const fullName = `${user.firstName} ${user.lastName}`
  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={fullName}
        className="group/profile inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border border-stone-200/90 bg-white/70 py-0 pr-2.5 pl-1.5 font-semibold text-foreground transition-colors outline-none hover:bg-white focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:border-orange-300 data-popup-open:bg-orange-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 dark:data-popup-open:border-orange-400/50 dark:data-popup-open:bg-orange-500/15"
      >
        {/* the initials come from CSS, so the only visible text is the first name that the label contains (WCAG 2.5.3) */}
        <span
          aria-hidden="true"
          data-initials={initials}
          className="flex size-8 items-center justify-center rounded-full bg-orange-100 text-[13px] font-bold text-primary before:content-[attr(data-initials)] dark:bg-orange-500/20 dark:text-orange-300"
        />
        {/* the button is named with the full name; the visible first name is part of it (WCAG 2.5.3) */}
        <span aria-hidden="true" className="hidden max-w-32 truncate sm:inline">
          {user.firstName}
        </span>
        <ChevronDown
          aria-hidden="true"
          className="size-4 transition-transform duration-(--motion-base) ease-(--ease-out) group-data-popup-open/profile:rotate-180"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-72 p-2">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-3 px-2 py-2.5">
            <span
              aria-hidden="true"
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-primary dark:bg-orange-500/20 dark:text-orange-300"
            >
              {initials}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[15px] font-semibold text-foreground">{fullName}</span>
              {user.username ? (
                <span className="truncate text-[13px] font-normal text-muted-foreground">
                  @{user.username}
                </span>
              ) : null}
            </span>
            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
              {t(`userMenu.role.${user.role}`)}
            </Badge>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="h-11 gap-3 px-3 text-[15px]" render={<Link to="/orders" />}>
          <Package className="size-[18px]" />
          {t('nav.myOrders')}
        </DropdownMenuItem>
        <DropdownMenuItem className="h-11 gap-3 px-3 text-[15px]" render={<Link to="/favorites" />}>
          <Heart className="size-[18px]" />
          {t('favorites.title')}
        </DropdownMenuItem>
        {user.role === 'admin' ? (
          <DropdownMenuItem className="h-11 gap-3 px-3 text-[15px]" render={<Link to="/admin" />}>
            <LayoutDashboard className="size-[18px]" />
            {t('nav.adminPanel')}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          className="h-11 gap-3 px-3 text-[15px]"
          onClick={logout}
        >
          <LogOut className="size-[18px]" />
          {t('userMenu.logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
