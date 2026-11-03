import type { QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'

import { ErrorState, NotFound } from '@/components/feedback/feedback'
import { queryClient } from '@/lib/query-client'

import { routeTree } from './routeTree.gen'

export interface RouterContext {
  queryClient: QueryClient
}

export const router = createRouter({
  routeTree,
  context: { queryClient } satisfies RouterContext,
  defaultPreload: 'intent',
  defaultNotFoundComponent: NotFound,
  defaultErrorComponent: ({ error, reset }) => (
    <ErrorState message={error instanceof Error ? error.message : undefined} onRetry={reset} />
  ),
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
