import { Link } from '@tanstack/react-router'
import { ShoppingCart } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useCart } from '@/features/cart/hooks/use-cart'

/** Header cart link with a live item count. */
export function CartButton() {
  const { t } = useTranslation()
  const { count } = useCart()
  return (
    <Link
      to="/cart"
      className={cn(buttonVariants({ variant: 'outline', size: 'icon' }), 'relative')}
      aria-label={t('cart.open', { n: count })}
    >
      <ShoppingCart className="size-4" />
      <span
        aria-live="polite"
        className="absolute -top-1.5 -right-1.5 flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs leading-5 font-medium text-primary-foreground empty:hidden"
      >
        {count > 0 ? (count > 99 ? '99+' : count) : null}
      </span>
    </Link>
  )
}
