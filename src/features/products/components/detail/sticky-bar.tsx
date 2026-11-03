import { useTranslation } from 'react-i18next'

import type { Product } from '../../schemas'
import { CompactBuy } from './compact-buy'

/**
 * Phone only: a bottom bar that appears once the main buttons scroll out of view. From md up the same
 * compact buy block lives at the end of the sticky section bar instead.
 */
export function StickyBar({
  product,
  visible,
  onAdd,
}: {
  product: Product
  visible: boolean
  onAdd: () => void
}) {
  const { t } = useTranslation()
  if (!visible) return null
  return (
    <div
      role="region"
      aria-label={t('products.sticky')}
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 shadow-lg backdrop-blur md:hidden"
    >
      <CompactBuy product={product} onAdd={onAdd} className="mx-auto max-w-7xl px-4 py-2" />
    </div>
  )
}
