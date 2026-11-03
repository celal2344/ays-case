import { Link } from '@tanstack/react-router'
import { ShoppingCart } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { useCart } from '@/features/cart/hooks/use-cart'

/** Header cart link with a live item count. */
export function CartButton() {
  const { t } = useTranslation()
  const { count } = useCart()
  return (
    <Button
      variant="outline"
      size="icon"
      className="relative"
      aria-label={t('cart.open', { n: count })}
      render={<Link to="/cart" />}
    >
      <ShoppingCart className="size-4" />
      <span
        aria-live="polite"
        className="absolute -top-1.5 -right-1.5 flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs leading-5 font-medium text-primary-foreground empty:hidden"
      >
        {count > 0 ? (count > 99 ? '99+' : count) : null}
      </span>
    </Button>
  )
}
