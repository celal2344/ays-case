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

function applyLanguage(language: string) {
  document.documentElement.lang = language
  if (i18next.language !== language) void i18next.changeLanguage(language)
}

applyLanguage(usePreferencesStore.getState().language)
usePreferencesStore.subscribe((state) => applyLanguage(state.language))

export default i18next
