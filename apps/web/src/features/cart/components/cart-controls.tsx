import { ShoppingCart } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { PendingButton } from '@/components/pending-button'
import type { Product } from '@/features/products/schemas'

import { useAddButton } from '../hooks/use-add-to-cart'
import { useCart } from '../hooks/use-cart'
import { CartLineStepper } from './cart-line-stepper'

/**
 * The card's cart action: "Add to cart" until the product is in the cart, then the shared stepper
 * (the trash at quantity 1 removes the line).
 */
export function CartControls({ product }: { product: Product }) {
  const { t } = useTranslation()
  const { add, pending } = useAddButton(product)
  const cart = useCart()
  const line = cart.lines.find((l) => l.productId === product.id)

  if (!line) {
    return (
      <PendingButton
        className="w-full"
        size="sm"
        pending={pending}
        disabled={product.stock <= 0}
        onClick={() => void add()}
      >
        <ShoppingCart className="size-4" />
        {t('products.addToCart')}
      </PendingButton>
    )
  }

  return <CartLineStepper product={product} />
}
