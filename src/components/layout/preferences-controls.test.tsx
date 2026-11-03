import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from 'next-themes'
import { describe, expect, it } from 'vitest'

import { usePreferencesStore } from '@/preferences/store'

import { PreferencesControls } from './preferences-controls'

describe('PreferencesControls', () => {
  it('switches the language and persists it', async () => {
    render(
      <ThemeProvider attribute="class">
        <PreferencesControls />
      </ThemeProvider>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Türkçe' }))
    expect(usePreferencesStore.getState().language).toBe('tr')
    expect(localStorage.getItem('ays-case:v1:prefs')).toContain('"language":"tr"')
  })

  it('applies the dark class when dark theme is chosen', async () => {
    render(
      <ThemeProvider attribute="class">
        <PreferencesControls />
      </ThemeProvider>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Theme' }))
    await userEvent.click(await screen.findByRole('menuitemradio', { name: 'Dark' }))
    expect(document.documentElement).toHaveClass('dark')
  })
})
