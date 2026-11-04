import { useBlocker } from '@tanstack/react-router'
import { useRef } from 'react'

/**
 * Blocks leaving a form with unsaved changes (route changes and tab close). Call `markSaved()` right
 * before navigating away after a successful save, so that navigation is not blocked.
 */
export function useUnsavedChangesGuard(dirty: boolean) {
  const saved = useRef(false)
  const blocker = useBlocker({
    shouldBlockFn: () => dirty && !saved.current,
    enableBeforeUnload: () => dirty && !saved.current,
    withResolver: true,
  })
  return {
    blocker,
    markSaved: () => {
      saved.current = true
    },
  }
}
