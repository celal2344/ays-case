import type { QueryClient } from '@tanstack/react-query'
import { createRouter, type RouterHistory } from '@tanstack/react-router'

import { ErrorState, NotFound } from '@/components/feedback/feedback'
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
