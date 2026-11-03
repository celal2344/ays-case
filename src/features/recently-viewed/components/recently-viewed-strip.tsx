import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { ProductStrip } from '@/features/products/components/product-strip'

import { useRecentlyViewed } from '../hooks/use-recently-viewed'

/** "Recently viewed" carousel; renders nothing while the list (minus `excludeId`) is empty. */
export function RecentlyViewedStrip({ excludeId }: { excludeId?: number }) {
  const { t } = useTranslation()
  const { items, clear } = useRecentlyViewed(excludeId)
  if (items.length === 0) return null
  return (
    <ProductStrip
      id="recently-viewed-heading"
      title={t('recentlyViewed.title')}
      products={items}
      action={
        <Button variant="link" size="sm" onClick={clear}>
          {t('recentlyViewed.clear')}
        </Button>
      }
    />
  )
}
