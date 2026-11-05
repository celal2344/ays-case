import { Link } from '@tanstack/react-router'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { CartButton } from './cart-button'
import { FavoritesButton } from './favorites-button'
import { HeaderSearch } from './header-search'
import { MegaMenu } from './mega-menu'
import { MobileNav } from './mobile-nav'
import { LanguageToggle, ThemeToggle } from './preferences-controls'
import { useHeaderHeight } from './use-header-height'
import { UserMenu } from './user-menu'

export function Header() {
  const { t } = useTranslation()
  const ref = useRef<HTMLElement>(null)
  useHeaderHeight(ref)
  return (
    <header
      ref={ref}
      className="glass glass-header sticky top-0 z-40 rounded-none border-x-0 border-t-0 shadow-[0_1px_0_rgba(28,25,23,0.04)]"
    >
      <div className="page-container flex flex-wrap items-center gap-x-3 gap-y-2 py-2 md:h-[68px] md:flex-nowrap md:gap-x-5 md:py-0">
        <MobileNav />
        <Link to="/" className="flex shrink-0 items-center gap-2.5 text-foreground">
          <span
            aria-hidden="true"
            className="flex size-9 items-center justify-center rounded-[10px] bg-brand text-lg font-extrabold text-white"
          >
            a
          </span>
          <span className="sr-only text-[19px] font-bold tracking-[-0.01em] sm:not-sr-only">
            {t('app.name')}
          </span>
        </Link>
        {/* one search box: its own row on phones, the wide centre of the bar from md up */}
        <HeaderSearch className="order-last basis-full sm:max-w-none md:order-none md:max-w-[720px] md:basis-auto" />
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden items-center gap-2 md:flex">
            <LanguageToggle />
            <ThemeToggle />
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
