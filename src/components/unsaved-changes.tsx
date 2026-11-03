import { useTranslation } from 'react-i18next'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { useUnsavedChangesGuard } from '@/lib/use-unsaved-changes-guard'

export function UnsavedChangesDialog({
  blocker,
}: {
  blocker: ReturnType<typeof useUnsavedChangesGuard>['blocker']
}) {
  const { t } = useTranslation()
  return (
    <AlertDialog
      open={blocker.status === 'blocked'}
      onOpenChange={(open) => {
        if (!open && blocker.status === 'blocked') blocker.reset()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('admin.form.discard.title')}</AlertDialogTitle>
          <AlertDialogDescription>{t('admin.form.discard.body')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('admin.form.discard.stay')}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => blocker.status === 'blocked' && blocker.proceed()}
          >
            {t('admin.form.discard.leave')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
