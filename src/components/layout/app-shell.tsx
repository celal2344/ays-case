import { Outlet } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import { usePendingCartAction } from '@/features/cart/hooks/use-pending-cart-action'
import { Toaster } from '@/components/ui/sonner'

import { Header } from './header'

export function AppShell({ children }: { children?: ReactNode }) {
  usePendingCartAction()
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children ?? <Outlet />}</main>
      <Toaster richColors closeButton />
    </div>
  )
}
