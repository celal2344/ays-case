import { Link } from '@tanstack/react-router'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { AdminMenu } from './admin-menu'
import { CartButton } from './cart-button'
import { FavoritesButton } from './favorites-button'
import { HeaderSearch } from './header-search'
import { MegaMenu } from './mega-menu'
import { MobileNav } from './mobile-nav'
import { useNavItems } from './nav-items'
import { PreferencesControls } from './preferences-controls'
import { useHeaderHeight } from './use-header-height'
import { UserMenu } from './user-menu'

export function Header() {
  const { t } = useTranslation()
  const navItems = useNavItems()
  const ref = useRef<HTMLElement>(null)
  useHeaderHeight(ref)
  return (
    <header
      ref={ref}
      className="glass glass-header sticky top-0 z-40 rounded-none border-x-0 border-t-0 shadow-[0_1px_0_rgba(28,25,23,0.04)]"
    >
      <div className="page-container flex flex-wrap items-center gap-x-3 gap-y-2 py-2">
        <MobileNav />
        <Link to="/" className="flex shrink-0 items-center gap-2 text-lg font-bold">
          <span
            aria-hidden="true"
            className="flex size-8 items-center justify-center rounded-lg bg-brand text-base text-neutral-900"
          >
            a
          </span>
          <span className="sr-only sm:not-sr-only">{t('app.name')}</span>
        </Link>
        {/* one search box: its own row on phones, the wide centre of the bar from md up */}
        <HeaderSearch className="order-last basis-full sm:max-w-none md:order-none md:basis-auto" />
        <nav aria-label={t('nav.main')} className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
              activeProps={{ className: 'text-foreground' }}
            >
              {t(item.labelKey)}
            </Link>
          ))}
          <AdminMenu />
        </nav>
        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <div className="hidden md:block">
            <PreferencesControls />
          </div>
          <FavoritesButton />
          <CartButton />
          <UserMenu />
        </div>
      </div>
      <div className="hidden border-t border-white/60 lg:block dark:border-white/10">
        <div className="page-container">
          <MegaMenu />
        </div>
      </div>
    </header>
  )
}
