import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'

import { hasDiscount } from '../pricing'
import type { Product } from '../schemas'

export function StockBadge({ product }: { product: Pick<Product, 'availability' | 'stock'> }) {
  const { t } = useTranslation()
  if (product.availability === 'in') return null
  return product.availability === 'out' ? (
    <Badge variant="destructive">{t('products.stock.out')}</Badge>
  ) : (
    <Badge variant="secondary">{t('products.stock.low', { left: product.stock })}</Badge>
  )
}

export function DiscountBadge({ product }: { product: Pick<Product, 'discountPercentage'> }) {
  const { t } = useTranslation()
  if (!hasDiscount(product)) return null
  return (
    <Badge>{t('products.discount', { percent: Math.round(product.discountPercentage) })}</Badge>
  )
}
