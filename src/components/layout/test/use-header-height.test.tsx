import { render } from '@testing-library/react'
import { useRef } from 'react'
import { describe, expect, it } from 'vitest'

import { useHeaderHeight } from '../use-header-height'

function Probe() {
  const ref = useRef<HTMLElement>(null)
  useHeaderHeight(ref)
  return <header ref={ref} />
}

describe('useHeaderHeight', () => {
  it('publishes the header height and removes it on unmount', () => {
    const { container, unmount } = render(<Probe />)
    const header = container.querySelector('header')!
    Object.defineProperty(header, 'offsetHeight', { configurable: true, value: 83 })
    unmount()
    const second = render(<Probe />)
    expect(document.documentElement.style.getPropertyValue('--header-h')).toBe('0px')
    second.unmount()
    expect(document.documentElement.style.getPropertyValue('--header-h')).toBe('')
  })
})
