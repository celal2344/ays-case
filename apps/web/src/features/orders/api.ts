import type { Shipping } from '@ays/validators'

import { api, call } from '@/lib/api'

/** Checkout: only the shipping details go; items and prices come from the server cart and catalog. */
export async function placeOrder(shipping: Shipping) {
  const { data } = await call(api.orders.$post({ json: { shipping } }), 201)
  return data
}

export async function getOrders() {
  const { data } = await call(api.orders.$get())
  return data
}

export async function getOrder(id: string) {
  const { data } = await call(api.orders[':id'].$get({ param: { id } }))
  return data
}
