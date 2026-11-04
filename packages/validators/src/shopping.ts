import { z } from 'zod'

import { envelope } from './http.js'

/** The most products kept in a user's recently viewed list. */
export const MAX_RECENTLY_VIEWED = 12

/** A sanity bound on one request; the real cap is the product's stock. */
export const MAX_CART_QUANTITY = 1000

const productId = z.number().int().positive()
const quantity = z.number().int().min(1).max(MAX_CART_QUANTITY)

/** One cart line: only ids and quantities. Prices come from the catalog at render time. */
export const cartItemSchema = z.object({
  productId,
  quantity: z.number().int().min(1),
  addedAt: z.string(),
})

export const addCartItemBodySchema = z.object({ productId, quantity })
export const setCartQuantityBodySchema = z.object({ quantity })

/** Product ids, newest first. */
export const productIdListSchema = z.array(productId)

export const cartResponseSchema = envelope(z.array(cartItemSchema))
export const cartItemResponseSchema = envelope(cartItemSchema)
export const productIdListResponseSchema = envelope(productIdListSchema)

export type CartItem = z.infer<typeof cartItemSchema>
export type AddCartItemBody = z.infer<typeof addCartItemBodySchema>
export type SetCartQuantityBody = z.infer<typeof setCartQuantityBodySchema>
