import type { LinkProps } from '@tanstack/react-router'

export interface NavItem {
  to: NonNullable<LinkProps['to']>
  labelKey: 'nav.home'
}

// Only routes that exist so far; later gates add Products, Orders, Admin.
export const NAV_ITEMS: NavItem[] = [{ to: '/', labelKey: 'nav.home' }]
