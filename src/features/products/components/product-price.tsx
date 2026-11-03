import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/format'
import { selectLanguage, usePreferencesStore } from '@/preferences/store'

import { hasDiscount, salePriceCents, toCents } from '../pricing'
import type { Product } from '../schemas'

export function ProductPrice({
  product,
  className,
}: {
  product: Pick<Product, 'price' | 'discountPercentage'>
  className?: string
}) {
  const { t } = useTranslation()
  const language = usePreferencesStore(selectLanguage)
  const discounted = hasDiscount(product)
  return (
    <div className={cn('flex flex-wrap items-baseline gap-x-2', className)}>
      <span className="font-semibold">{formatPrice(salePriceCents(product) / 100, language)}</span>
      {discounted ? (
        <span className="text-sm text-muted-foreground line-through">
          <span className="sr-only">{t('products.originalPrice')}</span>
          {formatPrice(toCents(product.price) / 100, language)}
        </span>
      ) : null}
    </div>
  )
}
