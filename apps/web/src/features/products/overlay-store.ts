import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { storageKey } from '@/lib/storage'

import type { OverlaySnapshot } from './catalog'
import type { Product } from './schemas'

export const FIRST_LOCAL_ID = 100_000
export const isLocal = (id: number) => id >= FIRST_LOCAL_ID

export type ProductInput = Omit<Product, 'id'>
export type ProductPatch = Partial<Omit<Product, 'id'>>

/** `stock` is the current merged stock; the caller knows it, the overlay may not hold it. */
export interface StockLine {
  id: number
  quantity: number
  stock: number
}

interface ProductOverlayState extends OverlaySnapshot {
  nextLocalId: number
  /** Stores a new product under a fresh local id; the id comes from the counter, never from the server. */
  create: (input: ProductInput) => Product
  update: (id: number, patch: ProductPatch) => void
  remove: (id: number) => void
  decrementStock: (lines: StockLine[]) => void
  reset: () => void
}

function omitKey<T>(record: Record<number, T>, key: number): Record<number, T> {
  return Object.fromEntries(Object.entries(record).filter(([k]) => Number(k) !== key))
}

export const useProductOverlayStore = create<ProductOverlayState>()(
  persist(
    (set, get) => ({
      created: {},
      patched: {},
      deleted: [],
      nextLocalId: FIRST_LOCAL_ID,

      create: (input) => {
        const product: Product = { ...input, id: get().nextLocalId }
        set((s) => ({
          created: { ...s.created, [product.id]: product },
          nextLocalId: s.nextLocalId + 1,
        }))
        return product
      },

      update: (id, patch) =>
        set((s) => {
          const existing = s.created[id]
          if (existing) return { created: { ...s.created, [id]: { ...existing, ...patch } } }
          return { patched: { ...s.patched, [id]: { ...s.patched[id], ...patch } } }
        }),

      remove: (id) =>
        set((s) => ({
          created: omitKey(s.created, id),
          patched: omitKey(s.patched, id),
          // local products vanish entirely; remote ones are hidden
          deleted: isLocal(id) || s.deleted.includes(id) ? s.deleted : [...s.deleted, id],
        })),

      decrementStock: (lines) => {
        for (const { id, quantity, stock } of lines) {
          get().update(id, { stock: Math.max(0, stock - quantity) })
        }
      },

      reset: () => set({ created: {}, patched: {}, deleted: [], nextLocalId: FIRST_LOCAL_ID }),
    }),
    {
      name: storageKey('product-overlay'),
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ created, patched, deleted, nextLocalId }) => ({
        created,
        patched,
        deleted,
        nextLocalId,
      }),
    },
  ),
)
