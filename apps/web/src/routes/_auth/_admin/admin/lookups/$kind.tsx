import { createFileRoute, notFound } from '@tanstack/react-router'

import { PageSkeleton } from '@/components/feedback/feedback'
import { LookupsPage } from '@/features/admin/components/lookups-page'
import { isLookupKind } from '@/features/admin/lookups'

export const Route = createFileRoute('/_auth/_admin/admin/lookups/$kind')({
  beforeLoad: ({ params }) => {
    if (!isLookupKind(params.kind)) throw notFound()
  },
  pendingComponent: PageSkeleton,
  component: LookupsPage,
})
