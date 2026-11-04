import { api, call, callNoContent } from '@/lib/api'

export async function getCart() {
  const { data } = await call(api.cart.$get())
  return data
}

export async function addCartItem(productId: number, quantity: number) {
  const { data } = await call(api.cart.items.$post({ json: { productId, quantity } }))
  return data
}

export async function setCartQuantity(productId: number, quantity: number) {
  const { data } = await call(
    api.cart.items[':productId'].$put({
      param: { productId: String(productId) },
      json: { quantity },
    }),
  )
  return data
}

export async function removeCartItem(productId: number) {
  await callNoContent(
    api.cart.items[':productId'].$delete({ param: { productId: String(productId) } }),
  )
}

export async function clearCart() {
  await callNoContent(api.cart.$delete())
}
