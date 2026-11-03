import { getRouteApi } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { NotFound } from '@/components/feedback/feedback'
import { useCatalog } from '@/features/products/hooks/use-catalog'

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
  const { products } = useCatalog()
  const product = products?.find((p) => p.id === Number(productId))
  if (!product) return <NotFound />
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t('admin.form.editTitle')}</h1>
      {/* key: a different product (or a reset) gets a fresh form with fresh defaults */}
      <ProductForm key={product.id} product={product} />
    </div>
  )
}
