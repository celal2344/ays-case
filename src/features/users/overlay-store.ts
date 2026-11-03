import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { storageKey } from '@/lib/storage'

import type { User } from './schemas'

export const FIRST_LOCAL_USER_ID = 100_000
export const isLocalUser = (id: number) => id >= FIRST_LOCAL_USER_ID

export type UserInput = Omit<User, 'id'>
export type UserPatch = Partial<Omit<User, 'id'>>

export interface UserOverlaySnapshot {
  created: Record<number, User>
  patched: Record<number, UserPatch>
  deleted: number[]
}

interface UserOverlayState extends UserOverlaySnapshot {
  nextLocalId: number
  /** Stores a new user under a fresh local id (DummyJSON's own id always collides). */
  create: (input: UserInput) => User
  update: (id: number, patch: UserPatch) => void
  remove: (id: number) => void
  reset: () => void
}

function omitKey<T>(record: Record<number, T>, key: number): Record<number, T> {
  return Object.fromEntries(Object.entries(record).filter(([k]) => Number(k) !== key))
}

export const useUserOverlayStore = create<UserOverlayState>()(
  persist(
    (set, get) => ({
      created: {},
      patched: {},
      deleted: [],
      nextLocalId: FIRST_LOCAL_USER_ID,

      create: (input) => {
        const user: User = { ...input, id: get().nextLocalId }
        set((s) => ({
          created: { ...s.created, [user.id]: user },
          nextLocalId: s.nextLocalId + 1,
        }))
        return user
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
          // local users vanish entirely; remote ones are hidden
          deleted: isLocalUser(id) || s.deleted.includes(id) ? s.deleted : [...s.deleted, id],
        })),

      reset: () => set({ created: {}, patched: {}, deleted: [], nextLocalId: FIRST_LOCAL_USER_ID }),
    }),
    {
      name: storageKey('user-overlay'),
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
