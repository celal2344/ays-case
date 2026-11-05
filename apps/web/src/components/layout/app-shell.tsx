import { Outlet, useRouterState } from '@tanstack/react-router'
import { useEffect, type ReactNode } from 'react'

import { useAuthStore } from '@/features/auth/store'
import { usePendingCartAction } from '@/features/cart/hooks/use-pending-cart-action'
import { usePendingFavoriteAction } from '@/features/favorites/hooks/use-pending-favorite-action'
import { Toaster } from '@/components/ui/sonner'

import { Header } from './header'
import { RouteProgress } from './route-progress'
import { SiteFooter } from './site-footer'

export function AppShell({ children }: { children?: ReactNode }) {
  // idempotent: public pages render at once and learn who is signed in as soon as the session is known
  useEffect(() => {
    void useAuthStore.getState().bootstrap()
  }, [])
  // the homepage's sections span the window and use the page container themselves
  const home = useRouterState({ select: (s) => s.location.pathname === '/' })
  // login and register are full-screen pages with their own layout
  const bare = useRouterState({
    select: (s) => s.location.pathname === '/login' || s.location.pathname === '/register',
  })
  usePendingCartAction()
  usePendingFavoriteAction()
  if (bare) {
    return (
      <>
        <RouteProgress />
        {children ?? <Outlet />}
        <Toaster richColors closeButton />
      </>
    )
  }
  return (
    <div className="flex min-h-svh flex-col text-foreground">
      <RouteProgress />
      <Header />
      <main className={home ? 'flex-1' : 'page-container flex-1 py-6'}>
        {children ?? <Outlet />}
      </main>
      <SiteFooter />
      <Toaster richColors closeButton />
    </div>
  )
}
