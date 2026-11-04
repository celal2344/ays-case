import { z } from 'zod'

import { envelope } from './http.js'

/** Shared by the API and the checkout form. */
export const SHIPPING_LIMITS = {
  fullName: { min: 2, max: 80 },
  address: { min: 5, max: 200 },
  city: { min: 2, max: 60 },
} as const

export const PHONE_PATTERN = /^\+?[0-9 ()-]{7,20}$/

// The message of each rule is the field name: the web form turns it into a translated text, and the
// API sends it back in the validation error's `errors[]`.
export const shippingSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(SHIPPING_LIMITS.fullName.min, 'fullName')
    .max(SHIPPING_LIMITS.fullName.max, 'fullName'),
  address: z
    .string()
    .trim()
    .min(SHIPPING_LIMITS.address.min, 'address')
    .max(SHIPPING_LIMITS.address.max, 'address'),
  city: z
    .string()
    .trim()
    .min(SHIPPING_LIMITS.city.min, 'city')
    .max(SHIPPING_LIMITS.city.max, 'city'),
  phone: z.string().trim().regex(PHONE_PATTERN, 'phone'),
})

export const createOrderBodySchema = z.object({ shipping: shippingSchema })

/** A purchased line, frozen at purchase time so later admin edits cannot rewrite history. */
export const orderLineSchema = z.object({
  /** Null only if the product was hard-deleted afterwards. */
  productId: z.number().int().nullable(),
  title: z.string(),
  thumbnail: z.string().nullable(),
  /** List price per unit, in cents. */
  listCents: z.number().int(),
  /** Price per unit actually paid (after discount), in cents. */
  unitCents: z.number().int(),
  discountPercentage: z.number(),
  quantity: z.number().int(),
})

export const orderSchema = z.object({
  id: z.uuid(),
  userId: z.string(),
  createdAt: z.string(),
  lines: z.array(orderLineSchema),
  totals: z.object({
    subtotalCents: z.number().int(),
    discountCents: z.number().int(),
    totalCents: z.number().int(),
  }),
  shipping: shippingSchema,
})

export const orderResponseSchema = envelope(orderSchema)
export const orderListResponseSchema = envelope(z.array(orderSchema))

export type Shipping = z.infer<typeof shippingSchema>
export type OrderLine = z.infer<typeof orderLineSchema>
export type Order = z.infer<typeof orderSchema>
