import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'

import { hasDiscount, stockLevel } from '../pricing'
import type { Product } from '../schemas'

export function StockBadge({ stock }: { stock: number }) {
  const { t } = useTranslation()
  const level = stockLevel(stock)
  if (level === 'in') return null
  return level === 'out' ? (
    <Badge variant="destructive">{t('products.stock.out')}</Badge>
  ) : (
    <Badge variant="secondary">{t('products.stock.low', { left: stock })}</Badge>
  )
}

export function DiscountBadge({ product }: { product: Pick<Product, 'discountPercentage'> }) {
  const { t } = useTranslation()
  if (!hasDiscount(product)) return null
  return (
    <Badge>{t('products.discount', { percent: Math.round(product.discountPercentage) })}</Badge>
  )
}
