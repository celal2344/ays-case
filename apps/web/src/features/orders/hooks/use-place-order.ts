import { useMutation, useQueryClient } from '@tanstack/react-query'

import { cartKeys } from '@/features/cart/queries'
import { productKeys } from '@/features/products/query-keys'
import type { AppError } from '@/lib/http-error'

import { placeOrder } from '../api'
import { orderKeys } from '../queries'
import type { Order, Shipping } from '../schemas'

/**
 * The purchase is one server operation (docs/data-and-state.md, "Checkout"): the server reads its own
 * cart and prices, takes the stock and empties the cart, or refuses and changes nothing. The page
 * only sends the shipping details and shows the server's numbers.
 */
export function usePlaceOrder() {
  const queryClient = useQueryClient()

  return useMutation<Order, AppError, Shipping>({
    mutationFn: placeOrder,
    onSuccess: (order) => {
      queryClient.setQueryData(orderKeys.detail(order.id), order)
    },
    // stock changed and the cart is empty, so those are refetched; a refusal leaves both as they were
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: cartKeys.all }),
        queryClient.invalidateQueries({ queryKey: orderKeys.all }),
        queryClient.invalidateQueries({ queryKey: productKeys.catalog() }),
        queryClient.invalidateQueries({ queryKey: productKeys.details() }),
      ]),
  })
}
