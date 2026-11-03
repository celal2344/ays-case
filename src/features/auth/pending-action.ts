import { z } from 'zod'

import { storageKey } from '@/lib/storage'

// "Add to cart" clicked while logged out: remembered until login, consumed once (wired in G4).
const pendingActionSchema = z.object({
  type: z.literal('add-to-cart'),
  productId: z.number().int(),
  quantity: z.number().int().min(1),
})
export type PendingAction = z.infer<typeof pendingActionSchema>

const KEY = storageKey('pending-action')

export function setPendingAction(action: PendingAction) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(action))
  } catch {
    // sessionStorage unavailable: the user just has to click again after logging in
  }
}

export function consumePendingAction(): PendingAction | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    sessionStorage.removeItem(KEY)
    if (raw === null) return null
    const parsed = pendingActionSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

/** Peeks without consuming. */
export function hasPendingAction(): boolean {
  try {
    return sessionStorage.getItem(KEY) !== null
  } catch {
    return false
  }
}
