import { Outlet } from '@tanstack/react-router'

import { AdminSidebar } from './admin-sidebar'

/** Every `/admin/*` page renders inside this layout, so the sidebar stays put between pages. */
export function AdminLayout() {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:gap-6">
      <AdminSidebar />
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  )
}
