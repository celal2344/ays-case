import { createRootRouteWithContext } from '@tanstack/react-router'

import { AppShell } from '@/components/layout/app-shell'
import type { RouterContext } from '@/router'

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => <AppShell />,
})
