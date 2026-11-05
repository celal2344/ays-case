import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from 'next-themes'
import { describe, expect, it } from 'vitest'

import { usePreferencesStore } from '@/preferences/store'

import { PreferencesControls } from '../preferences-controls'

const renderControls = () =>
  render(
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <PreferencesControls />
    </ThemeProvider>,
  )

describe('PreferencesControls', () => {
  it('one button switches the language back and forth and persists it', async () => {
    renderControls()
    await userEvent.click(screen.getByRole('button', { name: /Switch language/ }))
    expect(usePreferencesStore.getState().language).toBe('tr')
    expect(localStorage.getItem('ays-case:v1:prefs')).toContain('"language":"tr"')
    await userEvent.click(screen.getByRole('button', { name: /Dili değiştir/ }))
    expect(usePreferencesStore.getState().language).toBe('en')
  })

  it('one button flips light and dark', async () => {
    renderControls()
    await userEvent.click(screen.getByRole('button', { name: 'Switch to dark theme' }))
    expect(document.documentElement).toHaveClass('dark')
    await userEvent.click(await screen.findByRole('button', { name: 'Switch to light theme' }))
    expect(document.documentElement).not.toHaveClass('dark')
  })
})
