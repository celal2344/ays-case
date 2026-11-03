import { createFileRoute } from '@tanstack/react-router'

import { PageSkeleton } from '@/components/feedback/feedback'
import { EditUserPage } from '@/features/users/components/user-form-pages'
import { usersQueryOptions } from '@/features/users/queries'

export const Route = createFileRoute('/_auth/_admin/admin/users/$userId/edit')({
  loader: ({ context }) => context.queryClient.query(usersQueryOptions),
  pendingComponent: PageSkeleton,
  component: EditUserPage,
})
