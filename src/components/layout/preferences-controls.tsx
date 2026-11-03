import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { Language } from '@/lib/format'
import { selectLanguage, usePreferencesStore } from '@/preferences/store'

const THEMES = ['light', 'dark', 'system'] as const

export function ThemeToggle() {
  const { t } = useTranslation()
  const { theme = 'system', setTheme } = useTheme()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="icon" aria-label={t('prefs.theme.label')} />}
      >
        <Sun className="size-4 dark:hidden" />
        <Moon className="hidden size-4 dark:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          {THEMES.map((value) => (
            <DropdownMenuRadioItem key={value} value={value}>
              {value === 'system' ? <Monitor className="size-4" /> : null}
              {t(`prefs.theme.${value}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function LanguageToggle() {
  const { t } = useTranslation()
  const language = usePreferencesStore(selectLanguage)
  const setLanguage = usePreferencesStore((s) => s.setLanguage)
  return (
    <ToggleGroup
      variant="outline"
      aria-label={t('prefs.language.label')}
      value={[language]}
      onValueChange={(next) => {
        const value = next[0] as Language | undefined
        if (value) setLanguage(value)
      }}
    >
      <ToggleGroupItem value="tr" aria-label="Türkçe">
        TR
      </ToggleGroupItem>
      <ToggleGroupItem value="en" aria-label="English">
        EN
      </ToggleGroupItem>
    </ToggleGroup>
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
