import { Outlet } from '@tanstack/react-router'
import { useEffect, type ReactNode } from 'react'

import { useAuthStore } from '@/features/auth/store'
import { usePendingCartAction } from '@/features/cart/hooks/use-pending-cart-action'
import { usePendingFavoriteAction } from '@/features/favorites/hooks/use-pending-favorite-action'
import { Toaster } from '@/components/ui/sonner'

import { Header } from './header'
import { RouteProgress } from './route-progress'

export function AppShell({ children }: { children?: ReactNode }) {
  // idempotent: public pages render at once and learn who is signed in as soon as the session is known
  useEffect(() => {
    void useAuthStore.getState().bootstrap()
  }, [])
  usePendingCartAction()
  usePendingFavoriteAction()
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <RouteProgress />
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children ?? <Outlet />}</main>
      <Toaster richColors closeButton />
    </div>
  )
}
