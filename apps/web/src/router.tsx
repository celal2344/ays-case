import type { QueryClient } from '@tanstack/react-query'
import { createRouter, type RouterHistory } from '@tanstack/react-router'

import { ErrorState, NotFound, PageSkeleton } from '@/components/feedback/feedback'
import { authContext, type AuthContext } from '@/features/auth/context'
import { queryClient } from '@/lib/query-client'

import { routeTree } from './routeTree.gen'

export interface RouterContext {
  queryClient: QueryClient
  auth: AuthContext
}

export function createAppRouter(options?: {
  history?: RouterHistory
  context?: Partial<RouterContext>
}) {
  return createRouter({
    routeTree,
    history: options?.history,
    context: { queryClient, auth: authContext, ...options?.context },
    defaultPreload: false,
    // smooth page changes where the browser supports view transitions; others just navigate
    defaultViewTransition: true,
    // fast loads show no skeleton; one that appears stays long enough not to flicker
    defaultPendingComponent: PageSkeleton,
    defaultPendingMs: 200,
    defaultPendingMinMs: 400,
    defaultNotFoundComponent: NotFound,
    defaultErrorComponent: ({ error, reset }) => (
      <ErrorState message={error instanceof Error ? error.message : undefined} onRetry={reset} />
    ),
  })
}

export const router = createAppRouter()

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
