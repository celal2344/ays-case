import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { storageKey } from '@/lib/storage'

import type { LocalReview } from './schemas'

export interface NewReview {
  productId: number
  userId: string
  authorName: string
  rating: number
  comment: string
}

interface ReviewsState {
  byProduct: Record<number, LocalReview[]>
  /** Keys of API reviews an admin removed, per product. */
  hidden: Record<number, string[]>
  /** One review per user per product: returns null when the user already has one. */
  add: (input: NewReview) => LocalReview | null
  update: (productId: number, id: string, patch: Pick<LocalReview, 'rating' | 'comment'>) => void
  remove: (productId: number, id: string) => void
  hideSeeded: (productId: number, key: string) => void
  /** Called when a product is deleted. */
  removeProduct: (productId: number) => void
  reset: () => void
}

function omitKey<T>(record: Record<number, T>, key: number): Record<number, T> {
  return Object.fromEntries(Object.entries(record).filter(([k]) => Number(k) !== key))
}

export const useReviewsStore = create<ReviewsState>()(
  persist(
    (set, get) => ({
      byProduct: {},
      hidden: {},

      add: (input) => {
        const existing = get().byProduct[input.productId] ?? []
        if (existing.some((r) => r.userId === input.userId)) return null
        const review: LocalReview = {
          ...input,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        }
        set((s) => ({ byProduct: { ...s.byProduct, [input.productId]: [review, ...existing] } }))
        return review
      },

      update: (productId, id, patch) =>
        set((s) => ({
          byProduct: {
            ...s.byProduct,
            [productId]: (s.byProduct[productId] ?? []).map((r) =>
              r.id === id ? { ...r, ...patch } : r,
            ),
          },
        })),

      remove: (productId, id) =>
        set((s) => ({
          byProduct: {
            ...s.byProduct,
            [productId]: (s.byProduct[productId] ?? []).filter((r) => r.id !== id),
          },
        })),

      hideSeeded: (productId, key) =>
        set((s) => {
          const current = s.hidden[productId] ?? []
          return current.includes(key)
            ? s
            : { hidden: { ...s.hidden, [productId]: [...current, key] } }
        }),

      removeProduct: (productId) =>
        set((s) => ({
          byProduct: omitKey(s.byProduct, productId),
          hidden: omitKey(s.hidden, productId),
        })),

      reset: () => set({ byProduct: {}, hidden: {} }),
    }),
    {
      name: storageKey('reviews'),
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ byProduct, hidden }) => ({ byProduct, hidden }),
    },
  ),
)
