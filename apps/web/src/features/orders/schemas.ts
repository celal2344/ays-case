import { z } from 'zod'

export const ORDER_ERRORS = {
  fullName: 'checkout.errors.fullName',
  address: 'checkout.errors.address',
  city: 'checkout.errors.city',
  phone: 'checkout.errors.phone',
} as const

export const shippingSchema = z.object({
  fullName: z.string().trim().min(2, ORDER_ERRORS.fullName).max(80, ORDER_ERRORS.fullName),
  address: z.string().trim().min(5, ORDER_ERRORS.address).max(200, ORDER_ERRORS.address),
  city: z.string().trim().min(2, ORDER_ERRORS.city).max(60, ORDER_ERRORS.city),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ()-]{7,20}$/, ORDER_ERRORS.phone),
})
export type Shipping = z.infer<typeof shippingSchema>

export const emptyShipping: Shipping = { fullName: '', address: '', city: '', phone: '' }

// What `POST /carts/add` answers (hand-written from dummyjson.json: Cart); only the id is used.
export const remoteCartSchema = z.object({ id: z.number() }).passthrough()

/** A purchased line, frozen at purchase time so later admin edits cannot rewrite history. */
export interface OrderLine {
  productId: number
  title: string
  thumbnail: string
  /** List price per unit, in cents. */
  listCents: number
  /** Price per unit actually paid (after discount), in cents. */
  unitCents: number
  discountPercentage: number
  quantity: number
}

export interface Order {
  id: string
  userId: number
  createdAt: string
  lines: OrderLine[]
  totals: { subtotalCents: number; discountCents: number; totalCents: number }
  shipping: Shipping
  /** Id echoed by `POST /carts/add`; absent when the order held only local products. */
  remoteCartId?: number
}
