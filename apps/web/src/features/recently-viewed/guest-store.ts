import { MAX_RECENTLY_VIEWED } from '@ays/validators'
import { create } from 'zustand'

interface GuestViewedState {
  /** Product ids, newest first. Memory only: gone on reload, never merged into an account. */
  ids: number[]
  record: (productId: number) => void
  clear: () => void
}

/** Recently viewed for signed-out visitors. Signed-in users use the server (see `use-recently-viewed`). */
export const useGuestViewedStore = create<GuestViewedState>()((set) => ({
  ids: [],
  record: (productId) =>
    set((s) => ({
      ids: [productId, ...s.ids.filter((id) => id !== productId)].slice(0, MAX_RECENTLY_VIEWED),
    })),
  clear: () => set({ ids: [] }),
}))
