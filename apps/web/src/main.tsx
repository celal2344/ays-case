import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { ThemeProvider } from 'next-themes'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './i18n'
import './index.css'
import { setSessionExpiredHandler, useAuthStore } from './features/auth/store'
import { queryClient } from './lib/query-client'
import { storageKey } from './lib/storage'
import { router } from './router'

// Ask the server who is signed in (the session cookie), so public pages (header, nav) know.
void useAuthStore.getState().bootstrap()

setSessionExpiredHandler(() => {
  void router.navigate({ to: '/login', search: { redirect: router.state.location.href } })
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey={storageKey('theme')}
    >
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
)
