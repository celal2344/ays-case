import { getRouteApi } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { NotFound, PageSkeleton } from '@/components/feedback/feedback'
import { useProduct } from '@/features/products/hooks/use-product'

import { useLookups } from '../hooks/use-lookups'
import { ProductForm } from './product-form'

const editRoute = getRouteApi('/_auth/_admin/admin/products/$productId/edit')

export function NewProductPage() {
  const { t } = useTranslation()
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t('admin.form.newTitle')}</h1>
      <ProductForm />
    </div>
  )
}

export function EditProductPage() {
  const { t } = useTranslation()
  const { productId } = editRoute.useParams()
  const { product, notFound, isPending } = useProduct(Number(productId))
  // the form maps the product's tags to ids, so the tag list must be there before it starts
  const tags = useLookups('tags')
  if (isPending || tags.isPending) return <PageSkeleton />
  if (notFound || !product) return <NotFound />
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t('admin.form.editTitle')}</h1>
      {/* key: a different product gets a fresh form with fresh defaults */}
      <ProductForm key={product.id} product={product} />
    </div>
  )
}
