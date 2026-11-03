import type { LinkProps } from '@tanstack/react-router'

import { selectIsAdmin, selectIsAuthenticated, useAuthStore } from '@/features/auth/store'

export interface NavItem {
  to: NonNullable<LinkProps['to']>
  labelKey: 'nav.products' | 'nav.orders' | 'nav.admin'
}

// Admin becomes a menu (Products / Users) in G5/G5b.
export function useNavItems(): NavItem[] {
  const isAuthenticated = useAuthStore(selectIsAuthenticated)
  const isAdmin = useAuthStore(selectIsAdmin)
  const items: NavItem[] = [{ to: '/products', labelKey: 'nav.products' }]
  if (isAuthenticated) items.push({ to: '/orders', labelKey: 'nav.orders' })
  if (isAdmin) items.push({ to: '/admin', labelKey: 'nav.admin' })
  return items
}
