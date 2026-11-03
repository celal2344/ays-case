import { z } from 'zod'

import { storageKey } from '@/lib/storage'

// An action clicked while logged out ("add to cart", "favorite"): remembered until login, consumed once.
const pendingActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('add-to-cart'),
    productId: z.number().int(),
    quantity: z.number().int().min(1),
  }),
  z.object({ type: z.literal('favorite'), productId: z.number().int() }),
])
export type PendingAction = z.infer<typeof pendingActionSchema>

const KEY = storageKey('pending-action')

export function setPendingAction(action: PendingAction) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(action))
  } catch {
    // sessionStorage unavailable: the user just has to click again after logging in
  }
}

function read(): PendingAction | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (raw === null) return null
    const parsed = pendingActionSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

function clear() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // nothing to clear
  }
}

/**
 * Takes the pending action. With a `type`, an action of another type is left alone for whoever owns
 * it; unreadable data is dropped either way.
 */
export function consumePendingAction<T extends PendingAction['type']>(
  type?: T,
): Extract<PendingAction, { type: T }> | null {
  const action = read()
  if (action && type && action.type !== type) return null
  clear()
  return action as Extract<PendingAction, { type: T }> | null
}

/** Peeks without consuming; with a `type`, only true for an action of that type. */
export function hasPendingAction(type?: PendingAction['type']): boolean {
  const action = read()
  return action !== null && (!type || action.type === type)
}
