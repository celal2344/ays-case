import { createFileRoute } from '@tanstack/react-router'

import { PageSkeleton } from '@/components/feedback/feedback'
import { UsersPage } from '@/features/users/components/users-page'
import { usersQueryOptions } from '@/features/users/queries'
import { userSearchSchema } from '@/features/users/schemas'

export const Route = createFileRoute('/_auth/_admin/admin/users/')({
  validateSearch: userSearchSchema,
  loader: ({ context }) => context.queryClient.query(usersQueryOptions),
  pendingComponent: PageSkeleton,
  component: UsersPage,
})
