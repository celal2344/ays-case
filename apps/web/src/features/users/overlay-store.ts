import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { migrateUserId, migrateUserKeys, storageKey } from '@/lib/storage'

import type { User } from './schemas'

export const FIRST_LOCAL_USER_ID = 1
const LOCAL_PREFIX = 'local-'
export const localUserId = (n: number) => `${LOCAL_PREFIX}${n}`
export const isLocalUser = (id: string) => id.startsWith(LOCAL_PREFIX)

export type UserInput = Omit<User, 'id' | 'username'> & { username: string }
export type UserPatch = Partial<Omit<User, 'id'>>

export interface UserOverlaySnapshot {
  created: Record<string, User>
  patched: Record<string, UserPatch>
  deleted: string[]
}

interface UserOverlayState extends UserOverlaySnapshot {
  nextLocalId: number
  /** Stores a new user under a fresh local id (`local-<n>`, which never collides with the server's). */
  create: (input: UserInput) => User
  update: (id: string, patch: UserPatch) => void
  remove: (id: string) => void
  reset: () => void
}

function omitKey<T>(record: Record<string, T>, key: string): Record<string, T> {
  return Object.fromEntries(Object.entries(record).filter(([k]) => k !== key))
}

export const useUserOverlayStore = create<UserOverlayState>()(
  persist(
    (set, get) => ({
      created: {},
      patched: {},
      deleted: [],
      nextLocalId: FIRST_LOCAL_USER_ID,

      create: (input) => {
        const user: User = { ...input, id: localUserId(get().nextLocalId) }
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
      version: 2,
      // v1 keyed edits by DummyJSON's numeric ids; users created there are gone with the old backend
      migrate: (persisted, version) => {
        if (version >= 2) return persisted as UserOverlaySnapshot & { nextLocalId: number }
        const state = persisted as {
          patched?: Record<string, UserPatch>
          deleted?: (string | number)[]
        }
        return {
          created: {},
          patched: migrateUserKeys(state.patched),
          deleted: (state.deleted ?? []).flatMap((id) => {
            const next = migrateUserId(id)
            return next === null ? [] : [next]
          }),
          nextLocalId: FIRST_LOCAL_USER_ID,
        }
      },
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
