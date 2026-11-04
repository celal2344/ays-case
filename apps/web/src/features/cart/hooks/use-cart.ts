import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { selectUser, useAuthStore } from '@/features/auth/store'
import { errorMessageKey } from '@/lib/error-message'
import { toAppError } from '@/lib/http-error'
import { useOptimisticMutation } from '@/lib/optimistic'

import { addCartItem, clearCart, removeCartItem, setCartQuantity } from '../api'
import { cartKeys, cartQueryOptions } from '../queries'
import { selectCount, type CartLine } from '../selectors'

const NO_LINES: CartLine[] = []

/** What a quantity can be: a whole number from 1 to the stock. */
export const clampQuantity = (quantity: number, stock: number) =>
  Math.min(Math.max(1, Math.trunc(quantity) || 1), Math.max(0, stock))

/**
 * The signed-in user's cart, from the server. Components never pass a user id: the API scopes
 * everything to the session. Changes show at once and roll back if the server refuses them.
 */
export function useCart() {
  const { t } = useTranslation()
  const userId = useAuthStore(selectUser)?.id
  const query = useQuery({ ...cartQueryOptions, enabled: userId !== undefined })
  const lines = (userId === undefined ? undefined : query.data) ?? NO_LINES

  const onError = (error: unknown) => toast.error(t(errorMessageKey(toAppError(error))))
  const add = useOptimisticMutation<
    CartLine[],
    { productId: number; quantity: number; stock: number; title: string }
  >({
    queryKey: cartKeys.all,
    mutationFn: ({ productId, quantity }) => addCartItem(productId, quantity),
    update: (old = [], { productId, quantity, stock }) => {
      const existing = old.find((l) => l.productId === productId)
      const next = clampQuantity((existing?.quantity ?? 0) + quantity, stock)
      return existing
        ? old.map((l) => (l.productId === productId ? { ...l, quantity: next } : l))
        : [{ productId, quantity: next, addedAt: new Date().toISOString() }, ...old]
    },
    onError: (error, { title }) =>
      toast.error(
        error.status === 409 ? t('cart.outOfStock', { title }) : t(errorMessageKey(error)),
      ),
  })
  const set = useOptimisticMutation<CartLine[], { productId: number; quantity: number }>({
    queryKey: cartKeys.all,
    mutationFn: ({ productId, quantity }) => setCartQuantity(productId, quantity),
    update: (old = [], { productId, quantity }) =>
      old.map((l) => (l.productId === productId ? { ...l, quantity } : l)),
    onError,
  })
  const remove = useOptimisticMutation<CartLine[], number>({
    queryKey: cartKeys.all,
    mutationFn: removeCartItem,
    update: (old = [], productId) => old.filter((l) => l.productId !== productId),
    onError,
  })
  const clear = useOptimisticMutation<CartLine[], void>({
    queryKey: cartKeys.all,
    mutationFn: clearCart,
    update: () => [],
    onError,
  })

  const { mutateAsync: addAsync } = add
  const { mutate: setMutate } = set
  const { mutate: removeMutate } = remove
  const { mutate: clearMutate } = clear
  return useMemo(
    () => ({
      userId,
      lines,
      count: selectCount(lines),
      isPending: userId !== undefined && query.isPending,
      isError: query.isError,
      refetch: query.refetch,
      /** Adds, capped at `stock`; resolves with the quantity the line ends up with. */
      add: async (productId: number, quantity: number, stock: number, title: string) => {
        const before = lines.find((l) => l.productId === productId)?.quantity ?? 0
        const expected = clampQuantity(before + quantity, stock)
        await addAsync({ productId, quantity, stock, title })
        return expected
      },
      /** Sets the quantity, clamped to 1…stock; returns the clamped value. */
      setQuantity: (productId: number, quantity: number, stock: number) => {
        const clamped = clampQuantity(quantity, stock)
        if (userId !== undefined) setMutate({ productId, quantity: clamped })
        return clamped
      },
      remove: (productId: number) => {
        if (userId !== undefined) removeMutate(productId)
      },
      clear: () => {
        if (userId !== undefined) clearMutate()
      },
    }),
    [
      userId,
      lines,
      query.isPending,
      query.isError,
      query.refetch,
      addAsync,
      setMutate,
      removeMutate,
      clearMutate,
    ],
  )
}
