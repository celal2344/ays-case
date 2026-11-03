import { useMemo } from 'react'

import { selectUser, useAuthStore } from '@/features/auth/store'

import { selectCount } from '../selectors'
import { useCartStore, type CartLine } from '../store'

const NO_LINES: CartLine[] = []

/** The signed-in user's cart. Components never pass a user id: it is bound here. */
export function useCart() {
  const user = useAuthStore(selectUser)
  const userId = user?.id
  const lines =
    useCartStore((s) => (userId === undefined ? undefined : s.byUser[userId])) ?? NO_LINES
  const setQuantity = useCartStore((s) => s.setQuantity)
  const remove = useCartStore((s) => s.remove)
  const clear = useCartStore((s) => s.clear)

  return useMemo(
    () => ({
      userId,
      lines,
      count: selectCount(lines),
      setQuantity: (productId: number, quantity: number, stock: number) =>
        userId === undefined ? 0 : setQuantity(userId, productId, quantity, stock),
      remove: (productId: number) => userId !== undefined && remove(userId, productId),
      clear: () => userId !== undefined && clear(userId),
    }),
    [userId, lines, setQuantity, remove, clear],
  )
}
