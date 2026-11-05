import { Link } from '@tanstack/react-router'
import { Heart } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useFavorites } from '@/features/favorites/hooks/use-favorites'
import { cn } from '@/lib/utils'

import { HEADER_BADGE, HEADER_BUTTON } from './header-button'

/** Header link to the favorites page; the count badge is hidden at zero and pops when it grows. */
export function FavoritesButton() {
  const { t } = useTranslation()
  const { count } = useFavorites()
  const [seen, setSeen] = useState(count)
  const [pop, setPop] = useState(false)
  if (count !== seen) {
    setSeen(count)
    setPop(count > seen)
  }
  return (
    <Link
      to="/favorites"
      className={cn(HEADER_BUTTON, pop && 'cart-bump')}
      onAnimationEnd={() => setPop(false)}
      aria-label={t('favorites.open', { n: count })}
    >
      <Heart className="size-[18px]" />
      <span aria-hidden="true" className={HEADER_BADGE}>
        {count > 0 ? (count > 99 ? '99+' : count) : null}
      </span>
    </Link>
  )
}
