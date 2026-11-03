import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { Language } from '@/lib/format'
import { storageKey } from '@/lib/storage'

export type ShopView = 'grid' | 'table'

interface PreferencesState {
  language: Language
  shopView: ShopView
  setLanguage: (language: Language) => void
  setShopView: (view: ShopView) => void
}

// Theme (light / dark / system) is owned by next-themes, which shadcn's sonner already uses.
export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      language: 'tr',
      shopView: 'grid',
      setLanguage: (language) => set({ language }),
      setShopView: (shopView) => set({ shopView }),
    }),
    {
      name: storageKey('prefs'),
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ language, shopView }) => ({ language, shopView }),
    },
  ),
)

export const selectLanguage = (s: PreferencesState) => s.language
export const selectShopView = (s: PreferencesState) => s.shopView
