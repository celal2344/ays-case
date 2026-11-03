import { QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import { render } from '@testing-library/react'

import { createQueryClient } from '@/lib/query-client'
import { createAppRouter } from '@/router'

/** Renders the real route tree at `route` with a memory history. */
export async function renderApp(route: string) {
  const queryClient = createQueryClient() // one client for loaders and components
  const router = createAppRouter({
    history: createMemoryHistory({ initialEntries: [route] }),
    context: { queryClient },
  })
  await router.load()
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { router, ...utils }
}
