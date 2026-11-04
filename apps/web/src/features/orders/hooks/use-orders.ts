import { useMemo } from 'react'

import { selectUser, useAuthStore } from '@/features/auth/store'

import { useOrdersStore } from '../store'

/** The signed-in user's orders, newest first. */
export function useOrders() {
  const userId = useAuthStore(selectUser)?.id
  const all = useOrdersStore((s) => s.orders)
  return useMemo(() => all.filter((o) => o.userId === userId), [all, userId])
}

export function useOrder(orderId: string) {
  return useOrders().find((o) => o.id === orderId)
}
