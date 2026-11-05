import { Link } from '@tanstack/react-router'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import { ProductCard } from '@/features/products/components/product-card'
import type { Product, ProductSearch } from '@/features/products/schemas'

/** A titled row of product cards with a subtitle and a "see all" link to the matching list. */
export function ProductSection({
  title,
  subtitle,
  products,
  search,
  isNew = false,
}: {
  title: string
  subtitle: string
  products: Product[]
  search: Pick<ProductSearch, 'sort' | 'order'>
  isNew?: boolean
}) {
  const { t } = useTranslation()
  const id = useId()
  if (products.length === 0) return null
  return (
    <section aria-labelledby={id} className="page-container pt-12">
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h2 id={id} className="m-0 text-[26px] font-bold tracking-[-0.02em]">
            {title}
          </h2>
          <span className="text-sm text-muted-foreground">{subtitle}</span>
        </div>
        <Link
          to="/products"
          search={search}
          className="font-semibold whitespace-nowrap text-brand-text hover:underline"
        >
          {t('home.seeAll')}
        </Link>
      </div>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {products.map((product) => (
          <li key={product.id}>
            <ProductCard product={product} isNew={isNew} />
          </li>
        ))}
      </ul>
    </section>
  )
}
