import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { storageKey } from '@/lib/storage'

export interface CartLine {
  productId: number
  quantity: number
  addedAt: string
}

interface CartState {
  /** One cart per user id; lines hold only ids and quantities, prices come from the catalog at render time. */
  byUser: Record<string, CartLine[]>
  /** Adds `quantity` (default 1) and caps the line at `stock`; returns the resulting line quantity. */
  add: (userId: string, productId: number, quantity: number, stock: number) => number
  /** Sets the quantity, clamped to 1…stock; returns the resulting quantity. */
  setQuantity: (userId: string, productId: number, quantity: number, stock: number) => number
  remove: (userId: string, productId: number) => void
  clear: (userId: string) => void
  removeProductEverywhere: (productId: number) => void
  /** Every user's cart (Reset demo data). */
  reset: () => void
}

const clampQuantity = (quantity: number, stock: number) =>
  Math.min(Math.max(1, Math.trunc(quantity) || 1), Math.max(0, stock))

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      byUser: {},

      add: (userId, productId, quantity, stock) => {
        if (stock <= 0) return 0
        const lines = get().byUser[userId] ?? []
        const existing = lines.find((l) => l.productId === productId)
        const next = clampQuantity((existing?.quantity ?? 0) + quantity, stock)
        const updated: CartLine[] = existing
          ? lines.map((l) => (l.productId === productId ? { ...l, quantity: next } : l))
          : [...lines, { productId, quantity: next, addedAt: new Date().toISOString() }]
        set((s) => ({ byUser: { ...s.byUser, [userId]: updated } }))
        return next
      },

      setQuantity: (userId, productId, quantity, stock) => {
        const next = clampQuantity(quantity, stock)
        set((s) => ({
          byUser: {
            ...s.byUser,
            [userId]: (s.byUser[userId] ?? []).map((l) =>
              l.productId === productId ? { ...l, quantity: next } : l,
            ),
          },
        }))
        return next
      },

      remove: (userId, productId) =>
        set((s) => ({
          byUser: {
            ...s.byUser,
            [userId]: (s.byUser[userId] ?? []).filter((l) => l.productId !== productId),
          },
        })),

      clear: (userId) => set((s) => ({ byUser: { ...s.byUser, [userId]: [] } })),

      reset: () => set({ byUser: {} }),

      removeProductEverywhere: (productId) =>
        set((s) => ({
          byUser: Object.fromEntries(
            Object.entries(s.byUser).map(([userId, lines]) => [
              userId,
              lines.filter((l) => l.productId !== productId),
            ]),
          ),
        })),
    }),
    {
      name: storageKey('cart'),
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ byUser }) => ({ byUser }),
    },
  ),
)
