import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/_auth/_admin/admin/')({
  component: AdminDashboardPlaceholder,
})

// Replaced by the real dashboard in G5.
function AdminDashboardPlaceholder() {
  const { t } = useTranslation()
  return <h1 className="text-2xl font-semibold">{t('admin.title')}</h1>
}
