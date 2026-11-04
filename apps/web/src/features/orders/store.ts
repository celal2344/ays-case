import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { migrateUserId, storageKey } from '@/lib/storage'

import type { Order } from './schemas'

interface OrdersState {
  /** Newest first, every user's orders; views filter by user id. */
  orders: Order[]
  add: (order: Order) => void
  /** Every user's orders (Reset demo data). */
  reset: () => void
}

export const useOrdersStore = create<OrdersState>()(
  persist(
    (set) => ({
      orders: [],
      add: (order) => set((s) => ({ orders: [order, ...s.orders] })),
      reset: () => set({ orders: [] }),
    }),
    {
      name: storageKey('orders'),
      version: 2,
      // v1 orders carried DummyJSON's numeric user id
      migrate: (persisted, version) => {
        const state = persisted as { orders?: { userId: string | number }[] }
        if (version >= 2) return state
        return {
          orders: (state.orders ?? []).flatMap((order) => {
            const userId = migrateUserId(order.userId)
            return userId === null ? [] : [{ ...order, userId }]
          }),
        }
      },
      storage: createJSONStorage(() => localStorage),
      partialize: ({ orders }) => ({ orders }),
    },
  ),
)
