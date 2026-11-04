import { createFileRoute } from '@tanstack/react-router'

import { Forbidden } from '@/components/feedback/feedback'

export const Route = createFileRoute('/forbidden')({
  component: Forbidden,
})
