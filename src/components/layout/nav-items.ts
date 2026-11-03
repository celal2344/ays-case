import type { LinkProps } from '@tanstack/react-router'

import { selectIsAdmin, selectIsAuthenticated, useAuthStore } from '@/features/auth/store'

export interface NavItem {
  to: NonNullable<LinkProps['to']>
  labelKey: 'nav.home' | 'nav.orders' | 'nav.admin'
}

// Later gates add Products (public) and refine Admin into a menu.
export function useNavItems(): NavItem[] {
  const isAuthenticated = useAuthStore(selectIsAuthenticated)
  const isAdmin = useAuthStore(selectIsAdmin)
  const items: NavItem[] = [{ to: '/', labelKey: 'nav.home' }]
  if (isAuthenticated) items.push({ to: '/orders', labelKey: 'nav.orders' })
  if (isAdmin) items.push({ to: '/admin', labelKey: 'nav.admin' })
  return items
}
