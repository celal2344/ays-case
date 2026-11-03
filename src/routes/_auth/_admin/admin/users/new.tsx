import { createFileRoute } from '@tanstack/react-router'

import { PageSkeleton } from '@/components/feedback/feedback'
import { NewUserPage } from '@/features/users/components/user-form-pages'
import { usersQueryOptions } from '@/features/users/queries'

export const Route = createFileRoute('/_auth/_admin/admin/users/new')({
  loader: ({ context }) => context.queryClient.ensureQueryData(usersQueryOptions),
  pendingComponent: PageSkeleton,
  component: NewUserPage,
})
