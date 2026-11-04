import { type RefObject, useCallback, useEffect, useRef, useState } from 'react'

/** After a tab click the page scrolls on its own; the observer is ignored meanwhile so the clicked tab stays active. */
const CLICK_LOCK_MS = 1000

/**
 * Which of the page sections is under the sticky header + section bar. An IntersectionObserver watches
 * a thin line just below those two rows; the section crossing it is the active one (the last one stays
 * active across the gaps between sections).
 */
export function useScrollSpy(ids: readonly string[], barRef: RefObject<HTMLElement | null>) {
  const [active, setActive] = useState(ids[0] ?? '')
  const lockedUntil = useRef(0)
  const key = ids.join(',')

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const elements = key
      .split(',')
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)
    let observer: IntersectionObserver | undefined

    const build = () => {
      observer?.disconnect()
      const header = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--header-h'),
      )
      const offset = Math.round(
        (Number.isNaN(header) ? 0 : header) + (barRef.current?.offsetHeight ?? 0) + 8,
      )
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries)
            if (entry.isIntersecting && performance.now() >= lockedUntil.current)
              setActive(entry.target.id)
        },
        { rootMargin: `-${offset}px 0px -${Math.max(window.innerHeight - offset - 2, 0)}px 0px` },
      )
      for (const el of elements) observer.observe(el)
    }

    build()
    window.addEventListener('resize', build)
    return () => {
      window.removeEventListener('resize', build)
      observer?.disconnect()
    }
  }, [key, barRef])

  /** Marks a section active right away (a tab click) and holds it while the page scrolls there. */
  const select = useCallback((id: string) => {
    lockedUntil.current = performance.now() + CLICK_LOCK_MS
    setActive(id)
  }, [])

  return [active, select] as const
}
