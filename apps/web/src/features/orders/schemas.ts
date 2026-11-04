import type { Shipping } from '@ays/validators'

// The order, its lines and the shipping rules are the API's own (shared validators). The form's
// messages are the field names; the checkout page turns them into translated texts.
export { shippingSchema, type Order, type OrderLine, type Shipping } from '@ays/validators'

export const emptyShipping: Shipping = { fullName: '', address: '', city: '', phone: '' }
