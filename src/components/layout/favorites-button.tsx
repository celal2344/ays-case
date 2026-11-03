import { Link } from '@tanstack/react-router'
import { Heart } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { buttonVariants } from '@/components/ui/button'
import { useFavorites } from '@/features/favorites/hooks/use-favorites'
import { cn } from '@/lib/utils'

/** Header link to the favorites page; the count badge is hidden at zero. */
export function FavoritesButton() {
  const { t } = useTranslation()
  const { count } = useFavorites()
  return (
    <Link
      to="/favorites"
      className={cn(buttonVariants({ variant: 'outline', size: 'icon' }), 'relative')}
      aria-label={t('favorites.open', { n: count })}
    >
      <Heart className="size-4" />
      <span
        aria-hidden="true"
        className="absolute -top-1.5 -right-1.5 flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs leading-5 font-medium text-primary-foreground empty:hidden"
      >
        {count > 0 ? (count > 99 ? '99+' : count) : null}
      </span>
    </Link>
  )
}
