import type { LinkProps } from '@tanstack/react-router'

import { selectIsAdmin, selectIsAuthenticated, useAuthStore } from '@/features/auth/store'

export interface NavItem {
  to: NonNullable<LinkProps['to']>
  labelKey:
    'nav.products' | 'nav.orders' | 'admin.nav.dashboard' | 'admin.nav.products' | 'admin.nav.users'
}

export function useNavItems(): NavItem[] {
  const isAuthenticated = useAuthStore(selectIsAuthenticated)
  const items: NavItem[] = [{ to: '/products', labelKey: 'nav.products' }]
  if (isAuthenticated) items.push({ to: '/orders', labelKey: 'nav.orders' })
  return items
}

const ADMIN_ITEMS: NavItem[] = [
  { to: '/admin', labelKey: 'admin.nav.dashboard' },
  { to: '/admin/products', labelKey: 'admin.nav.products' },
  { to: '/admin/users', labelKey: 'admin.nav.users' },
]

/** The Admin menu entries, or null for everyone who is not an admin. */
export function useAdminNavItems(): NavItem[] | null {
  return useAuthStore(selectIsAdmin) ? ADMIN_ITEMS : null
}
