import { ShoppingCart, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { QuantityStepper } from '@/components/quantity-stepper'
import { Button } from '@/components/ui/button'
import type { Product } from '@/features/products/schemas'

import { useAddToCart } from '../hooks/use-add-to-cart'
import { useCart } from '../hooks/use-cart'

/**
 * The card's cart action: "Add to cart" until the product is in the cart, then a quantity stepper
 * (clamped to stock) with a remove button.
 */
export function CartControls({ product }: { product: Product }) {
  const { t } = useTranslation()
  const addToCart = useAddToCart()
  const cart = useCart()
  const line = cart.lines.find((l) => l.productId === product.id)

  if (!line) {
    return (
      <Button
        className="w-full"
        size="sm"
        disabled={product.stock <= 0}
        onClick={() => addToCart(product)}
      >
        <ShoppingCart className="size-4" />
        {t('products.addToCart')}
      </Button>
    )
  }

  return (
    <div className="flex w-full items-center justify-between gap-2">
      <QuantityStepper
        value={Math.min(line.quantity, Math.max(1, product.stock))}
        max={product.stock}
        onChange={(quantity) => cart.setQuantity(product.id, quantity, product.stock)}
      />
      <Button
        variant="outline"
        size="icon"
        aria-label={t('cart.remove', { title: product.title })}
        onClick={() => cart.remove(product.id)}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  )
}
