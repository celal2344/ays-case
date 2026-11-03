import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/format'
import { selectLanguage, usePreferencesStore } from '@/preferences/store'

import { hasDiscount, salePriceCents, toCents } from '../pricing'
import type { Product } from '../schemas'

/** The sale price in the brand colour (bold), the list price struck through when discounted. */
export function ProductPrice({
  product,
  className,
  large = false,
}: {
  product: Pick<Product, 'price' | 'discountPercentage'>
  className?: string
  large?: boolean
}) {
  const { t } = useTranslation()
  const language = usePreferencesStore(selectLanguage)
  const discounted = hasDiscount(product)
  return (
    <div className={cn('flex flex-wrap items-baseline gap-x-2', className)}>
      <span className={cn('font-bold text-brand-text', large ? 'text-3xl' : 'text-base')}>
        {formatPrice(salePriceCents(product) / 100, language)}
      </span>
      {discounted ? (
        <span className={cn('text-muted-foreground line-through', large ? 'text-base' : 'text-sm')}>
          <span className="sr-only">{t('products.originalPrice')}</span>
          {formatPrice(toCents(product.price) / 100, language)}
        </span>
      ) : null}
    </div>
  )
}
