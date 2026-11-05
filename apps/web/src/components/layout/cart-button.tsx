import { Link } from '@tanstack/react-router'
import { ShoppingCart } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'
import { useCart } from '@/features/cart/hooks/use-cart'

import { HEADER_BADGE, HEADER_BUTTON } from './header-button'

/** Header cart link with a live item count. */
export function CartButton() {
  const { t } = useTranslation()
  const { count } = useCart()
  // a short bump when something was added (adjusting state while rendering, no effect needed)
  const [seen, setSeen] = useState(count)
  const [bump, setBump] = useState(false)
  if (count !== seen) {
    setSeen(count)
    setBump(count > seen)
  }
  return (
    <Link
      to="/cart"
      className={cn(HEADER_BUTTON, bump && 'cart-bump')}
      onAnimationEnd={() => setBump(false)}
      aria-label={t('cart.open', { n: count })}
    >
      <ShoppingCart className="size-[18px]" />
      <span aria-live="polite" className={HEADER_BADGE}>
        {count > 0 ? (count > 99 ? '99+' : count) : null}
      </span>
    </Link>
  )
}
