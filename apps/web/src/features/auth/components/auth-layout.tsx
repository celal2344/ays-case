import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { LanguageToggle, ThemeToggle } from '@/components/layout/preferences-controls'
import { cn } from '@/lib/utils'

import type { PanelCard } from '../panel-images'
import { BrandPanel } from './brand-panel'

/**
 * Login and register share this split screen: the brand panel on wide screens, and the form column
 * with the language and theme buttons on top. On phones only the form column is left, with the logo
 * above the form. `footer` sits in the bottom right (below the form on phones).
 */
export function AuthLayout({
  title,
  text,
  cards,
  width,
  footer,
  children,
}: {
  title: string
  text: string
  cards: PanelCard[]
  width: 'max-w-[420px]' | 'max-w-[460px]'
  footer?: ReactNode
  children: ReactNode
}) {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-svh gap-4 bg-background p-4 text-foreground">
      <BrandPanel title={title} text={text} cards={cards} />
      <div className="flex min-w-0 flex-[1_1_45%] flex-col gap-6 lg:px-2">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2.5 lg:invisible">
            <span
              aria-hidden="true"
              className="flex size-9 items-center justify-center rounded-[10px] bg-brand text-lg font-extrabold text-white"
            >
              a
            </span>
            <span className="text-[19px] font-bold tracking-[-0.01em]">{t('app.name')}</span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
        <main className="flex flex-1 items-center justify-center py-4">
          <div className={cn('w-full', width)}>{children}</div>
        </main>
        {footer ? <div className="flex justify-center lg:justify-end">{footer}</div> : null}
      </div>
    </div>
  )
}
