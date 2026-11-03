import { afterEach, describe, expect, it } from 'vitest'

import { usePreferencesStore } from '@/preferences/store'

import { applyLanguage } from '..'

describe('document language', () => {
  afterEach(() => usePreferencesStore.setState({ language: 'en' }))

  it('sets <html lang>, the title and the meta description for the language', () => {
    document.head.innerHTML = '<meta name="description" content="">'
    applyLanguage('tr')
    expect(document.documentElement.lang).toBe('tr')
    expect(document.title).toBe('ays-case · Online mağaza')
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toContain(
      'online mağaza',
    )
    applyLanguage('en')
    expect(document.documentElement.lang).toBe('en')
    expect(document.title).toBe('ays-case · Online shop')
  })

  it('follows the language preference', () => {
    usePreferencesStore.getState().setLanguage('tr')
    expect(document.documentElement.lang).toBe('tr')
    usePreferencesStore.getState().setLanguage('en')
    expect(document.documentElement.lang).toBe('en')
  })
})
