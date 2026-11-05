import { render, screen, waitFor } from '@testing-library/react'
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
  it('a dropdown lists both languages, checks the current one and persists the choice', async () => {
    renderControls()
    await userEvent.click(screen.getByRole('button', { name: /Language/ }))
    const english = await screen.findByRole('menuitemradio', { name: 'English' })
    expect(english).toBeChecked()
    expect(screen.getByRole('menuitemradio', { name: 'Türkçe' })).not.toBeChecked()

    await userEvent.click(screen.getByRole('menuitemradio', { name: 'Türkçe' }))
    expect(usePreferencesStore.getState().language).toBe('tr')
    expect(localStorage.getItem('ays-case:v1:prefs')).toContain('"language":"tr"')

    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
    await userEvent.click(await screen.findByRole('button', { name: /Dil/ }))
    await userEvent.click(await screen.findByRole('menuitemradio', { name: 'English' }))
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
