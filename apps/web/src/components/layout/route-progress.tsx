import { useRouterState } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

const SHOW_AFTER_MS = 150

/** A thin bar at the top of the page while the router loads; fast navigations never show it. */
export function RouteProgress() {
  const pending = useRouterState({ select: (s) => s.status === 'pending' })
  const [late, setLate] = useState(false)

  useEffect(() => {
    if (!pending) return
    const timer = setTimeout(() => setLate(true), SHOW_AFTER_MS)
    return () => {
      clearTimeout(timer)
      setLate(false)
    }
  }, [pending])

  if (!pending || !late) return null
  return (
    <div
      aria-hidden="true"
      data-testid="route-progress"
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden bg-primary/20"
    >
      <div className="route-progress-bar h-full w-1/3 bg-primary" />
    </div>
  )
}
