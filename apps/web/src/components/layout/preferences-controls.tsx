import { Languages, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'
import { selectLanguage, usePreferencesStore } from '@/preferences/store'

import { HEADER_BUTTON } from './header-button'

/** One click flips light and dark; the first visit follows the system until then. */
export function ThemeToggle({ className }: { className?: string }) {
  const { t } = useTranslation()
  const { resolvedTheme, setTheme } = useTheme()
  const dark = resolvedTheme === 'dark'
  return (
    <button
      type="button"
      className={cn(HEADER_BUTTON, className)}
      aria-label={t(dark ? 'prefs.theme.toLight' : 'prefs.theme.toDark')}
      onClick={() => setTheme(dark ? 'light' : 'dark')}
    >
      <Sun
        aria-hidden="true"
        className="size-[18px] scale-100 rotate-0 transition-all duration-(--motion-base) ease-(--ease-out) dark:scale-0 dark:-rotate-90"
      />
      <Moon
        aria-hidden="true"
        className="absolute size-[18px] scale-0 rotate-90 transition-all duration-(--motion-base) ease-(--ease-out) dark:scale-100 dark:rotate-0"
      />
    </button>
  )
}

/** One button that switches TR and EN and shows the current language. */
export function LanguageToggle({ className }: { className?: string }) {
  const { t } = useTranslation()
  const language = usePreferencesStore(selectLanguage)
  const setLanguage = usePreferencesStore((s) => s.setLanguage)
  return (
    <button
      type="button"
      className={cn(HEADER_BUTTON, 'px-3', className)}
      aria-label={t('prefs.language.switch', { current: t(`prefs.language.${language}`) })}
      onClick={() => setLanguage(language === 'tr' ? 'en' : 'tr')}
    >
      <Languages aria-hidden="true" className="size-4" />
      <span aria-hidden="true">{language.toUpperCase()}</span>
    </button>
  )
}

export function PreferencesControls() {
  return (
    <div className="flex items-center gap-2">
      <LanguageToggle />
      <ThemeToggle />
    </div>
  )
}
