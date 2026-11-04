import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { storageKey } from '@/lib/storage'

export const MAX_RECENTLY_VIEWED = 12

interface RecentlyViewedState {
  /** Product ids per user key (user id, or 'guest'), newest first. Details come from the catalog. */
  byUser: Record<string, number[]>
  record: (userKey: string, productId: number) => void
  clear: (userKey: string) => void
  /** A product an admin deleted disappears from every list. */
  removeProductEverywhere: (productId: number) => void
  /** Every list (Reset demo data). */
  reset: () => void
}

export const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set) => ({
      byUser: {},

      record: (userKey, productId) =>
        set((s) => {
          const rest = (s.byUser[userKey] ?? []).filter((id) => id !== productId)
          return {
            byUser: {
              ...s.byUser,
              [userKey]: [productId, ...rest].slice(0, MAX_RECENTLY_VIEWED),
            },
          }
        }),

      clear: (userKey) => set((s) => ({ byUser: { ...s.byUser, [userKey]: [] } })),

      removeProductEverywhere: (productId) =>
        set((s) => ({
          byUser: Object.fromEntries(
            Object.entries(s.byUser).map(([key, ids]) => [
              key,
              ids.filter((id) => id !== productId),
            ]),
          ),
        })),

      reset: () => set({ byUser: {} }),
    }),
    {
      name: storageKey('recently-viewed'),
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ byUser }) => ({ byUser }),
    },
  ),
)
