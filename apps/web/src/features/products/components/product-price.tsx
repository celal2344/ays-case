import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/format'
import { selectLanguage, usePreferencesStore } from '@/preferences/store'

import { salePriceCents } from '@ays/validators'
import { hasDiscount } from '../pricing'
import type { Product } from '../schemas'

/** The sale price in the brand colour (bold), the list price struck through when discounted. */
export function ProductPrice({
  product,
  className,
  large = false,
}: {
  product: Pick<Product, 'priceCents' | 'discountPercentage'>
  className?: string
  large?: boolean
}) {
  const { t } = useTranslation()
  const language = usePreferencesStore(selectLanguage)
  const discounted = hasDiscount(product)
  return (
    <div className={cn('flex flex-wrap items-baseline gap-x-2', className)}>
      <span className={cn('font-bold text-brand-text', large ? 'text-3xl' : 'text-base')}>
        {formatMoney(salePriceCents(product), language)}
      </span>
      {discounted ? (
        <span className={cn('text-muted-foreground line-through', large ? 'text-base' : 'text-sm')}>
          <span className="sr-only">{t('products.originalPrice')}</span>
          {formatMoney(product.priceCents, language)}
        </span>
      ) : null}
    </div>
  )
}
