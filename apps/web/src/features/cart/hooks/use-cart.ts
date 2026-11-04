import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { selectUser, useAuthStore } from '@/features/auth/store'
import { errorMessageKey } from '@/lib/error-message'
import { toAppError } from '@/lib/http-error'
import { runExclusive } from '@/lib/in-flight'
import { useOptimisticMutation } from '@/lib/optimistic'

import { addCartItem, clearCart, removeCartItem, setCartQuantity } from '../api'
import { cartKeys, cartQueryOptions } from '../queries'
import { selectCount, type CartLine } from '../selectors'

const NO_LINES: CartLine[] = []

/** Quantity changes are sent once the user has stopped clicking or typing for this long. */
const QUANTITY_DEBOUNCE_MS = 300
/** Per product, outside React so a pending change still goes out if the stepper unmounts. */
const quantityTimers = new Map<number, ReturnType<typeof setTimeout>>()

const withQuantity = (old: CartLine[] = [], productId: number, quantity: number) =>
  old.map((l) => (l.productId === productId ? { ...l, quantity } : l))

/** What a quantity can be: a whole number from 1 to the stock. */
export const clampQuantity = (quantity: number, stock: number) =>
  Math.min(Math.max(1, Math.trunc(quantity) || 1), Math.max(0, stock))

/**
 * The signed-in user's cart, from the server. Components never pass a user id: the API scopes
 * everything to the session. Changes show at once and roll back if the server refuses them.
 */
export function useCart() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const userId = useAuthStore(selectUser)?.id
  const query = useQuery({ ...cartQueryOptions, enabled: userId !== undefined })
  const lines = (userId === undefined ? undefined : query.data) ?? NO_LINES

  const onError = (error: unknown) =>
    toast.error(t(errorMessageKey(toAppError(error))), { id: 'cart:error' })
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
    onError: (error, { productId, title }) =>
      toast.error(
        error.status === 409 ? t('cart.outOfStock', { title }) : t(errorMessageKey(error)),
        { id: `cart:${productId}` },
      ),
  })
  const set = useOptimisticMutation<CartLine[], { productId: number; quantity: number }>({
    queryKey: cartKeys.all,
    mutationFn: ({ productId, quantity }) => setCartQuantity(productId, quantity),
    update: (old, { productId, quantity }) => withQuantity(old, productId, quantity),
    onError: (error) => {
      onError(error)
      // the screen already shows the new quantity, so there is nothing to roll back to: ask the server
      void queryClient.invalidateQueries({ queryKey: cartKeys.all })
    },
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
  const { mutateAsync: removeAsync } = remove
  const { mutateAsync: clearAsync } = clear
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
      /**
       * Sets the quantity, clamped to 1…stock; returns the clamped value. The screen updates at once and
       * only the last value of a burst of clicks is sent.
       */
      setQuantity: (productId: number, quantity: number, stock: number) => {
        const clamped = clampQuantity(quantity, stock)
        if (userId === undefined) return clamped
        void queryClient.cancelQueries({ queryKey: cartKeys.all })
        queryClient.setQueryData<CartLine[]>(cartKeys.all, (old) =>
          withQuantity(old, productId, clamped),
        )
        clearTimeout(quantityTimers.get(productId))
        quantityTimers.set(
          productId,
          setTimeout(() => {
            quantityTimers.delete(productId)
            setMutate({ productId, quantity: clamped })
          }, QUANTITY_DEBOUNCE_MS),
        )
        return clamped
      },
      /** One removal per line at a time; it also drops a quantity change that has not been sent yet. */
      remove: async (productId: number) => {
        if (userId === undefined) return
        clearTimeout(quantityTimers.get(productId))
        quantityTimers.delete(productId)
        await runExclusive(`cart:remove:${productId}`, () => removeAsync(productId)).catch(
          () => undefined, // rolled back, and the error was shown
        )
      },
      clear: async () => {
        if (userId === undefined) return
        await runExclusive('cart:clear', () => clearAsync()).catch(() => undefined)
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
      removeAsync,
      clearAsync,
      queryClient,
    ],
  )
}
