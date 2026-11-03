import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'

import { usePreferencesStore } from '@/preferences/store'

import { en } from './locales/en'
import { tr } from './locales/tr'

void i18next.use(initReactI18next).init({
  lng: usePreferencesStore.getState().language,
  fallbackLng: 'en',
  resources: { en: { translation: en }, tr: { translation: tr } },
  interpolation: { escapeValue: false },
})

/** Keeps <html lang>, the page title and the meta description in step with the UI language. */
export function applyLanguage(language: string) {
  if (i18next.language !== language) void i18next.changeLanguage(language)
  document.documentElement.lang = language
  document.title = i18next.t('app.title', { lng: language })
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute('content', i18next.t('app.description', { lng: language }))
}

applyLanguage(usePreferencesStore.getState().language)
usePreferencesStore.subscribe((state) => applyLanguage(state.language))

export default i18next
