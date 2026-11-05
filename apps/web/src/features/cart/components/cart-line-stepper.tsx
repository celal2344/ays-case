import { QuantityStepper } from '@/components/quantity-stepper'
import type { Product } from '@/features/products/schemas'

import { useCart } from '../hooks/use-cart'

/**
 * The quantity of a product that is already in the cart: changes go to the cart (debounced), and the
 * "−" at 1 is the trash that removes the line. The one stepper for cards, the product page, its bars
 * and the cart page. Renders nothing when the product is not in the cart.
 */
export function CartLineStepper({ product }: { product: Pick<Product, 'id' | 'stock'> }) {
  const cart = useCart()
  const line = cart.lines.find((l) => l.productId === product.id)
  if (!line) return null
  return (
    <QuantityStepper
      value={Math.min(line.quantity, Math.max(1, product.stock))}
      max={product.stock}
      onChange={(quantity) => cart.setQuantity(product.id, quantity, product.stock)}
      onRemove={() => void cart.remove(product.id)}
    />
  )
}
