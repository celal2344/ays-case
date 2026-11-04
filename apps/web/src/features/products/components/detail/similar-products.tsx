import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { useCatalog } from '../../hooks/use-catalog'
import { ProductStrip } from '../product-strip'

const MAX_SIMILAR = 12

/** Other products of the same category, from the merged catalog (so admin edits and deletes apply). */
export function SimilarProducts({ productId, category }: { productId: number; category: string }) {
  const { t } = useTranslation()
  const { products } = useCatalog()
  const similar = useMemo(
    () =>
      (products ?? [])
        .filter((p) => p.category.slug === category && p.id !== productId)
        .slice(0, MAX_SIMILAR),
    [products, category, productId],
  )
  if (similar.length === 0) return null
  return <ProductStrip id="similar-heading" title={t('products.similar')} products={similar} />
}
