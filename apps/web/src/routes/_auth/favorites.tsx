import { createFileRoute } from '@tanstack/react-router'

import { FavoritesPage } from '@/features/favorites/components/favorites-page'

export const Route = createFileRoute('/_auth/favorites')({
  component: FavoritesPage,
})
