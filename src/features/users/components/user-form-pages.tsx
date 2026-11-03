import { getRouteApi } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { NotFound } from '@/components/feedback/feedback'

import { useUsers } from '../hooks/use-users'
import { UserForm } from './user-form'

const editRoute = getRouteApi('/_auth/_admin/admin/users/$userId/edit')

export function NewUserPage() {
  const { t } = useTranslation()
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t('admin.users.form.newTitle')}</h1>
      <UserForm />
    </div>
  )
}

export function EditUserPage() {
  const { t } = useTranslation()
  const { userId } = editRoute.useParams()
  const { users } = useUsers()
  const user = users?.find((u) => u.id === Number(userId))
  if (!user) return <NotFound />
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t('admin.users.form.editTitle')}</h1>
      {/* key: a different user (or a reset) gets a fresh form with fresh defaults */}
      <UserForm key={user.id} user={user} />
    </div>
  )
}
