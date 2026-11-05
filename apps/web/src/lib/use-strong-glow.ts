import { useEffect } from 'react'

/** Switches the page background to the stronger orange and pink glow while the page is mounted. */
export function useStrongGlow() {
  useEffect(() => {
    document.body.dataset.glow = 'strong'
    return () => {
      delete document.body.dataset.glow
    }
  }, [])
}
