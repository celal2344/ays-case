import { Link } from '@tanstack/react-router'
import { Menu } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

import { useAdminNavItems, useNavItems } from './nav-items'
import { PreferencesControls } from './preferences-controls'

export function MobileNav() {
  const { t } = useTranslation()
  const navItems = useNavItems()
  const adminItems = useAdminNavItems()
  const [open, setOpen] = useState(false)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="outline" size="icon" className="md:hidden" aria-label={t('nav.menu')} />
        }
      >
        <Menu className="size-4" />
      </SheetTrigger>
      <SheetContent side="left">
        <SheetHeader>
          <SheetTitle>{t('app.name')}</SheetTitle>
        </SheetHeader>
        <nav aria-label={t('nav.main')} className="flex flex-col gap-1 px-4">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-2 text-sm font-medium hover:bg-accent"
              activeProps={{ className: 'bg-accent' }}
            >
              {t(item.labelKey)}
            </Link>
          ))}
          {adminItems ? (
            <>
              <p className="mt-3 px-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {t('nav.admin')}
              </p>
              {adminItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-2 py-2 text-sm font-medium hover:bg-accent"
                  activeProps={{ className: 'bg-accent' }}
                >
                  {t(item.labelKey)}
                </Link>
              ))}
            </>
          ) : null}
        </nav>
        <div className="mt-auto px-4 pb-4">
          <PreferencesControls />
        </div>
      </SheetContent>
    </Sheet>
  )
}
