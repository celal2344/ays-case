import { useBlocker } from '@tanstack/react-router'
import { useRef } from 'react'

/**
 * Blocks leaving a form with unsaved changes (route changes and tab close). Call `markSaved()` right
 * before navigating away after a successful save, so that navigation is not blocked.
 */
export function useUnsavedChangesGuard(
  dirty: boolean,
  /** Navigations that stay inside the form (for example switching its section) and must not be blocked. */
  isInsideForm?: (next: { search: Record<string, unknown> }) => boolean,
) {
  const saved = useRef(false)
  const blocker = useBlocker({
    shouldBlockFn: ({ next }) =>
      dirty &&
      !saved.current &&
      !isInsideForm?.({ search: next.search as Record<string, unknown> }),
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
