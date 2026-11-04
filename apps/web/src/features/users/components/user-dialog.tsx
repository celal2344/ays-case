import { useTranslation } from 'react-i18next'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { useUsers } from '../hooks/use-users'
import { UserForm } from './user-form'

/**
 * The user form as a dialog, open while the URL says so (`?new=1` or `?edit=<id>`). An unknown id
 * opens nothing. Unsaved changes are asked about by the form's navigation guard when it is closed.
 */
export function UserDialog({
  target,
  onClose,
}: {
  target: 'new' | { id: string } | null
  onClose: () => void
}) {
  const { t } = useTranslation()
  const { users } = useUsers()
  const user =
    target !== null && target !== 'new' ? users?.find((u) => u.id === target.id) : undefined
  const open = target === 'new' || user !== undefined
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="top-0 left-0 h-svh max-h-none w-screen max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-none sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-h-[92svh] sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl">
        <DialogHeader>
          <DialogTitle>
            {t(user ? 'admin.users.form.editTitle' : 'admin.users.form.newTitle')}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t('admin.users.form.modalHint')}
          </DialogDescription>
        </DialogHeader>
        {/* key: a different user gets a fresh form with fresh defaults */}
        {open ? (
          <UserForm key={user?.id ?? 'new'} {...(user ? { user } : {})} onClose={onClose} />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
