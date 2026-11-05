import { useEffect } from 'react'

/** Turns the page glow off while the page is mounted (cart and checkout sit on a flat background). */
export function useFlatBackground() {
  useEffect(() => {
    document.body.dataset.flat = ''
    return () => {
      delete document.body.dataset.flat
    }
  }, [])
}
