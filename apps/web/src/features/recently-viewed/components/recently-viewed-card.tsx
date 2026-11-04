import { Link } from '@tanstack/react-router'

import { FavoriteButton } from '@/features/favorites/components/favorite-button'
import { ProductImage } from '@/features/products/components/product-image'
import { hasDiscount, salePriceCents, toCents } from '@/features/products/pricing'
import type { Product } from '@/features/products/schemas'
import { formatPrice } from '@/lib/format'
import { selectLanguage, usePreferencesStore } from '@/preferences/store'

/**
 * A small card for secondary lists: square thumbnail, two-line title, sale price. The whole card is one
 * link; the heart appears on hover or focus (always visible on touch screens). No cart button.
 */
export function RecentlyViewedCard({ product }: { product: Product }) {
  const language = usePreferencesStore(selectLanguage)
  const discounted = hasDiscount(product)
  return (
    <div className="group relative w-40 shrink-0 snap-start rounded-lg border bg-card focus-within:ring-3 focus-within:ring-ring/50">
      <Link
        to="/products/$productId"
        params={{ productId: String(product.id) }}
        className="block rounded-lg p-2 outline-none"
      >
        <ProductImage src={product.thumbnail} alt="" className="mx-auto size-28 rounded-md" />
        <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5">{product.title}</p>
        <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
          <span className="text-sm font-bold text-brand-text">
            {formatPrice(salePriceCents(product) / 100, language)}
          </span>
          {discounted ? (
            <span className="text-xs text-muted-foreground line-through">
              {formatPrice(toCents(product.price) / 100, language)}
            </span>
          ) : null}
        </p>
      </Link>
      <FavoriteButton
        productId={product.id}
        title={product.title}
        overlay
        className="absolute top-3 right-3 size-7 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
      />
    </div>
  )
}
