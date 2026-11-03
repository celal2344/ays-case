import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { MobileNav } from './mobile-nav'
import { NAV_ITEMS } from './nav-items'
import { PreferencesControls } from './preferences-controls'

export function Header() {
  const { t } = useTranslation()
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
        <MobileNav />
        <Link to="/" className="text-base font-semibold">
          {t('app.name')}
        </Link>
        <nav aria-label={t('nav.main')} className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
              activeProps={{ className: 'text-foreground' }}
            >
              {t(item.labelKey)}
            </Link>
          ))}
        </nav>
        <div className="ml-auto hidden md:block">
          <PreferencesControls />
        </div>
      </div>
    </header>
  )
}
