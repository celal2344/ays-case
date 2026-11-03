import { useEffect, useState, type RefObject } from 'react'

/** True while the element is (partly) inside the viewport. */
export function useInView(ref: RefObject<Element | null>) {
  const [inView, setInView] = useState(true)
  useEffect(() => {
    const element = ref.current
    if (!element || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => setInView(entry?.isIntersecting ?? true))
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])
  return inView
}
