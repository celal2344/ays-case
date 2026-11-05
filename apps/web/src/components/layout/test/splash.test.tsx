import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'

describe('static splash in index.html', () => {
  const html = readFileSync(resolve(__dirname, '../../../../index.html'), 'utf8')

  it('is CSS only: no inline script, reduced motion and dark mode handled', () => {
    expect(html).toMatch(/<div id="splash"/)
    expect(html).not.toMatch(/<script(?![^>]*src=)/)
    expect(html).toContain('prefers-reduced-motion')
    expect(html).toContain('prefers-color-scheme: dark')
  })

  it('is replaced when React mounts into #root', () => {
    document.body.innerHTML = html.slice(html.indexOf('<div id="root">'), html.indexOf('<script'))
    const root = document.getElementById('root')!
    expect(root.querySelector('#splash')).not.toBeNull()
    act(() => {
      createRoot(root).render(<p>app</p>)
    })
    expect(root.querySelector('#splash')).toBeNull()
    expect(root.textContent).toBe('app')
  })
})
