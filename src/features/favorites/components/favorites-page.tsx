import { Link } from '@tanstack/react-router'
import { Heart } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { EmptyState, ErrorState } from '@/components/feedback/feedback'
import { buttonVariants } from '@/components/ui/button'
import { ProductGrid, ProductGridSkeleton } from '@/features/products/components/product-grid'

import { useFavoriteProducts } from '../hooks/use-favorites'

export function FavoritesPage() {
  const { t } = useTranslation()
  const { items, isPending, isError, refetch } = useFavoriteProducts()

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t('favorites.title')}</h1>
      {isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : isPending || !items ? (
        <ProductGridSkeleton />
      ) : items.length === 0 ? (
        <EmptyState title={t('favorites.empty')}>
          <Link to="/products" className={buttonVariants({})}>
            <Heart className="size-4" aria-hidden="true" />
            {t('favorites.emptyCta')}
          </Link>
        </EmptyState>
      ) : (
        <ProductGrid products={items} />
      )}
    </div>
  )
}
