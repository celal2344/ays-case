import { type RefObject, useLayoutEffect } from 'react'

/**
 * Publishes the header's real height as `--header-h` on the root element, so sticky bars and scroll
 * anchors sit flush under it however many rows it has (the menu row at lg+, wrapping on small screens).
 */
export function useHeaderHeight(ref: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const root = document.documentElement
    const update = () => root.style.setProperty('--header-h', `${el.offsetHeight}px`)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => {
      observer.disconnect()
      root.style.removeProperty('--header-h')
    }
  }, [ref])
}
