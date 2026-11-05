import { ChevronDown, Languages, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useTranslation } from 'react-i18next'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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

const LANGUAGES = ['tr', 'en'] as const

/** A small menu of the two languages, each named in its own language; the current one is checked. */
export function LanguageMenu({ className }: { className?: string }) {
  const { t } = useTranslation()
  const language = usePreferencesStore(selectLanguage)
  const setLanguage = usePreferencesStore((s) => s.setLanguage)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(HEADER_BUTTON, 'px-3', className)}
        aria-label={`${language.toUpperCase()} · ${t('prefs.language.label')}: ${t(`prefs.language.${language}`)}`}
      >
        <Languages aria-hidden="true" className="size-4" />
        <span aria-hidden="true">{language.toUpperCase()}</span>
        <ChevronDown aria-hidden="true" className="size-3.5 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        <DropdownMenuRadioGroup
          value={language}
          onValueChange={(value) => {
            if (value === 'tr' || value === 'en') setLanguage(value)
          }}
        >
          {LANGUAGES.map((code) => (
            <DropdownMenuRadioItem key={code} value={code} lang={code} closeOnClick>
              {t(`prefs.language.${code}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function PreferencesControls() {
  return (
    <div className="flex items-center gap-2">
      <LanguageMenu />
      <ThemeToggle />
    </div>
  )
}
