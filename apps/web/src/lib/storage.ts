const PREFIX = 'ays-case:v1:'

export function storageKey(name: string) {
  return PREFIX + name
}

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

export function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage unavailable (private mode, quota): the app keeps working in memory
  }
}

const FIRST_LEGACY_LOCAL_USER_ID = 100_000

/**
 * User ids used to be DummyJSON's numbers; the API's are strings (`user-<n>` for the seeded users).
 * Maps an old persisted id to the new one; ids of users created in the old admin overlay are gone
 * (null), as are keys that were never user ids ('guest' passes through unchanged).
 */
export function migrateUserId(id: string | number): string | null {
  if (typeof id === 'string' && !/^\d+$/.test(id)) return id
  const n = Number(id)
  return n >= FIRST_LEGACY_LOCAL_USER_ID ? null : `user-${n}`
}

/** `migrateUserId` applied to the keys of a record. */
export function migrateUserKeys<T>(record: Record<string, T> | undefined): Record<string, T> {
  const entries = Object.entries(record ?? {}).flatMap(([key, value]) => {
    const next = migrateUserId(key)
    return next === null ? [] : [[next, value] as const]
  })
  return Object.fromEntries(entries)
}
