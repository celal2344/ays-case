import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const router = vi.hoisted(() => ({ status: 'idle' as 'idle' | 'pending' }))

vi.mock('@tanstack/react-router', () => ({
  useRouterState: ({ select }: { select: (s: { status: string }) => unknown }) =>
    select({ status: router.status }),
}))

import { RouteProgress } from '../route-progress'

describe('RouteProgress', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    router.status = 'idle'
  })

  it('stays hidden for a fast navigation and appears only after the delay', () => {
    router.status = 'pending'
    render(<RouteProgress />)
    expect(screen.queryByTestId('route-progress')).toBeNull()
    act(() => {
      vi.advanceTimersByTime(149)
    })
    expect(screen.queryByTestId('route-progress')).toBeNull()
    act(() => {
      vi.advanceTimersByTime(2)
    })
    expect(screen.getByTestId('route-progress')).toHaveAttribute('aria-hidden', 'true')
  })

  it('shows nothing when the router is idle', () => {
    render(<RouteProgress />)
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.queryByTestId('route-progress')).toBeNull()
  })
})
