import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { storageKey } from '@/lib/storage'

export const MAX_RECENT_SEARCHES = 6

/** Same text, ignoring case the Turkish way (dotted and dotless i stay distinct from each other). */
const same = (a: string, b: string) => a.toLocaleLowerCase('tr') === b.toLocaleLowerCase('tr')

interface SearchState {
  /** Committed searches of this browser, newest first. */
  recent: string[]
  /** Called when a search is committed (Enter, the "Search for" row, a recent chip), never per keystroke. */
  record: (query: string) => void
  remove: (query: string) => void
  clear: () => void
  /** Reset demo data. */
  reset: () => void
}

export const useSearchStore = create<SearchState>()(
  persist(
    (set) => ({
      recent: [],

      record: (query) => {
        const text = query.trim()
        if (!text) return
        set((s) => ({
          recent: [text, ...s.recent.filter((q) => !same(q, text))].slice(0, MAX_RECENT_SEARCHES),
        }))
      },

      remove: (query) => set((s) => ({ recent: s.recent.filter((q) => !same(q, query)) })),

      clear: () => set({ recent: [] }),

      reset: () => set({ recent: [] }),
    }),
    {
      name: storageKey('recent-searches'),
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ recent }) => ({ recent }),
    },
  ),
)
