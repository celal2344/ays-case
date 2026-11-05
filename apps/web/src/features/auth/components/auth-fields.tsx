import { AlertCircle, Eye, EyeOff } from 'lucide-react'
import { useId, useState, type ComponentProps, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const FIELD =
  'h-[50px] rounded-xl border-[#d6d3d1] bg-card px-3.5 text-[15px] focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15 aria-invalid:border-2 aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/15 dark:border-white/15'

/**
 * A label, an input and the field's message. An error turns the border red and is read out with the
 * field (`aria-invalid` and `aria-describedby`); a hint is plain help text under the field.
 */
export function AuthField({
  label,
  error,
  hint,
  children,
}: {
  label: string
  error?: string | null
  hint?: string
  /** Receives the id and the aria props the input needs. */
  children: (props: {
    id: string
    'aria-invalid': boolean
    'aria-describedby': string | undefined
  }) => ReactNode
}) {
  const id = useId()
  const messageId = `${id}-message`
  const describedBy = error || hint ? messageId : undefined
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id} className="text-sm font-semibold">
        {label}
      </Label>
      {children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': describedBy })}
      {error ? (
        <p id={messageId} className="m-0 flex items-center gap-1.5 text-[13px] text-destructive">
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="m-0 text-[13px] text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export function TextInput({ className, ...props }: ComponentProps<typeof Input>) {
  return <Input className={cn(FIELD, className)} {...props} />
}

/** A password input with a 44 × 44 show/hide button. */
export function PasswordInput({ className, ...props }: Omit<ComponentProps<typeof Input>, 'type'>) {
  const { t } = useTranslation()
  const [shown, setShown] = useState(false)
  return (
    <div className="relative">
      <Input
        {...props}
        type={shown ? 'text' : 'password'}
        className={cn(FIELD, 'pr-12', className)}
      />
      <button
        type="button"
        aria-label={t(shown ? 'login.hidePassword' : 'login.showPassword')}
        aria-pressed={shown}
        onClick={() => setShown((value) => !value)}
        className="absolute top-[3px] right-0.5 flex size-11 items-center justify-center rounded-lg text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {shown ? (
          <EyeOff className="size-[18px]" aria-hidden="true" />
        ) : (
          <Eye className="size-[18px]" aria-hidden="true" />
        )}
      </button>
    </div>
  )
}

/** The big primary button of both pages. */
export const AUTH_BUTTON =
  'h-[52px] w-full rounded-[14px] text-base font-semibold shadow-[0_10px_24px_-10px_rgba(194,65,12,0.7)]'
