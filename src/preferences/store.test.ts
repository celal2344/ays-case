import { describe, expect, it } from 'vitest'

import i18next from '@/i18n'

import { usePreferencesStore } from './store'

describe('preferences store', () => {
  it('persists language and shop view under the versioned key', () => {
    usePreferencesStore.getState().setLanguage('tr')
    usePreferencesStore.getState().setShopView('table')
    const saved = JSON.parse(localStorage.getItem('ays-case:v1:prefs') ?? '{}')
    expect(saved.state).toEqual({ language: 'tr', shopView: 'table' })
    expect(saved.version).toBe(1)
  })

  it('switches the i18n language and the html lang attribute', () => {
    usePreferencesStore.getState().setLanguage('tr')
    expect(i18next.language).toBe('tr')
    expect(document.documentElement.lang).toBe('tr')
    expect(i18next.t('feedback.error.retry')).toBe('Tekrar dene')
  })
})
