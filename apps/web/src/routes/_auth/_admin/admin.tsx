import { createFileRoute } from '@tanstack/react-router'

import { AdminLayout } from '@/features/admin/components/admin-layout'

export const Route = createFileRoute('/_auth/_admin/admin')({
  component: AdminLayout,
})
