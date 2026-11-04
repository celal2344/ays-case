import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { migrateUserKeys, storageKey } from '@/lib/storage'

interface FavoritesState {
  /** Product ids per user id, newest first. Titles, prices and stock always come from the catalog. */
  byUser: Record<string, number[]>
  /** Adds or removes; returns whether the product is a favorite afterwards. */
  toggle: (userId: string, productId: number) => boolean
  remove: (userId: string, productId: number) => void
  /** A product an admin deleted disappears from everyone's favorites. */
  removeProductEverywhere: (productId: number) => void
  /** Every user's favorites (Reset demo data). */
  reset: () => void
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      byUser: {},

      toggle: (userId, productId) => {
        const current = get().byUser[userId] ?? []
        const isFavorite = current.includes(productId)
        const next = isFavorite ? current.filter((id) => id !== productId) : [productId, ...current]
        set((s) => ({ byUser: { ...s.byUser, [userId]: next } }))
        return !isFavorite
      },

      remove: (userId, productId) =>
        set((s) => ({
          byUser: {
            ...s.byUser,
            [userId]: (s.byUser[userId] ?? []).filter((id) => id !== productId),
          },
        })),

      removeProductEverywhere: (productId) =>
        set((s) => ({
          byUser: Object.fromEntries(
            Object.entries(s.byUser).map(([userId, ids]) => [
              userId,
              ids.filter((id) => id !== productId),
            ]),
          ),
        })),

      reset: () => set({ byUser: {} }),
    }),
    {
      name: storageKey('favorites'),
      version: 2,
      // v1 keyed lists by DummyJSON's numeric user ids; the API's ids are strings
      migrate: (persisted, version) => {
        const state = persisted as { byUser?: Record<string, never[]> }
        return version < 2 ? { byUser: migrateUserKeys(state.byUser) } : state
      },
      storage: createJSONStorage(() => localStorage),
      partialize: ({ byUser }) => ({ byUser }),
    },
  ),
)
