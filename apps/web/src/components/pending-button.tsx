import { Loader2 } from 'lucide-react'
import type { ComponentProps } from 'react'

import { Button } from '@/components/ui/button'

/**
 * A button for an action that is being sent: disabled, `aria-busy`, with a spinner in front.
 * Pair it with `runExclusive`, which also ignores a second click inside the handler.
 */
export function PendingButton({
  pending = false,
  disabled,
  children,
  ...props
}: ComponentProps<typeof Button> & { pending?: boolean }) {
  return (
    <Button disabled={disabled || pending} aria-busy={pending || undefined} {...props}>
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
      {children}
    </Button>
  )
}
