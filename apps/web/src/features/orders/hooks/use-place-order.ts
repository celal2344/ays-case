import { useMutation, useQueryClient } from '@tanstack/react-query'

import { selectUser, useAuthStore } from '@/features/auth/store'
import { buildCartItems, cartTotals } from '@/features/cart/selectors'
import { useCartStore } from '@/features/cart/store'
import { applyOverlay } from '@/features/products/catalog'
import { isLocal, useProductOverlayStore } from '@/features/products/overlay-store'
import { catalogQueryOptions } from '@/features/products/queries'
import { AppError, toAppError } from '@/lib/http-error'

import { createRemoteCart } from '../api'
import { buildOrder } from '../build-order'
import type { Order, Shipping } from '../schemas'
import { useOrdersStore } from '../store'

export type CheckoutProblem = 'empty' | 'stock'

/** A refused purchase; `problem` and `title` let the page say what to fix. */
export class CheckoutError extends AppError {
  readonly problem: CheckoutProblem
  readonly title?: string
  constructor(problem: CheckoutProblem, title?: string) {
    super('validation', problem)
    this.problem = problem
    this.title = title
  }
}

/**
 * The purchase (docs/data-and-state.md, "Checkout sequence"). Everything is read fresh from the stores,
 * and nothing is written until DummyJSON has answered, so a failure leaves cart and stock untouched.
 */
export function usePlaceOrder() {
  const queryClient = useQueryClient()
  const user = useAuthStore(selectUser)

  return useMutation<Order, AppError, Shipping>({
    mutationFn: async (shipping) => {
      if (!user) throw new AppError('unauthorized', 'Not signed in')
      const lines = useCartStore.getState().byUser[user.id] ?? []
      if (lines.length === 0) throw new CheckoutError('empty')

      const remote = queryClient.getQueryData(catalogQueryOptions.queryKey) ?? []
      const { created, patched, deleted } = useProductOverlayStore.getState()
      const products = applyOverlay(remote, { created, patched, deleted })
      const { items, missing } = buildCartItems(lines, products)
      if (missing.length > 0) throw new CheckoutError('stock')
      const short = lines.find((l) => {
        const product = products.find((p) => p.id === l.productId)
        return !product || product.stock < l.quantity
      })
      if (short) {
        const title = products.find((p) => p.id === short.productId)?.title
        throw new CheckoutError('stock', title)
      }

      let remoteCartId: number | undefined
      const remoteLines = items
        .filter((i) => !isLocal(i.product.id))
        .map((i) => ({ id: i.product.id, quantity: i.quantity }))
      if (remoteLines.length > 0) {
        try {
          remoteCartId = await createRemoteCart(user.id, remoteLines)
        } catch (error) {
          throw toAppError(error)
        }
      }

      const order = buildOrder({
        id: crypto.randomUUID(),
        userId: user.id,
        createdAt: new Date().toISOString(),
        items,
        totals: cartTotals(items),
        shipping,
        remoteCartId,
      })
      useOrdersStore.getState().add(order)
      useProductOverlayStore
        .getState()
        .decrementStock(
          items.map((i) => ({ id: i.product.id, quantity: i.quantity, stock: i.product.stock })),
        )
      useCartStore.getState().clear(user.id)
      return order
    },
  })
}
