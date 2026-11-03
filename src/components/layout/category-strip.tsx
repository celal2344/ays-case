import { useQuery } from '@tanstack/react-query'
import { Link, useRouterState } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'
import { categoriesQueryOptions } from '@/features/products/queries'

const ITEM =
  'shrink-0 border-b-2 border-transparent px-3 py-2 text-sm font-medium whitespace-nowrap text-muted-foreground hover:text-foreground'
const ACTIVE = 'border-brand text-foreground'

/**
 * Horizontally scrollable category links under the header; the active one gets a brand underline.
 * Only DummyJSON categories: the filter panel on the list also knows admin-made ones.
 */
export function CategoryStrip() {
  const { t } = useTranslation()
  const { data: categories } = useQuery(categoriesQueryOptions)
  const active = useRouterState({
    select: (s) =>
      s.location.pathname === '/products' && typeof s.location.search.category === 'string'
        ? s.location.search.category
        : undefined,
  })
  const onProducts = useRouterState({ select: (s) => s.location.pathname === '/products' })

  return (
    <nav
      aria-label={t('nav.categories')}
      className="mx-auto flex max-w-7xl [scrollbar-width:thin] gap-1 overflow-x-auto px-2"
    >
      <Link
        to="/products"
        search={{}}
        className={cn(ITEM, onProducts && !active && ACTIVE)}
        aria-current={onProducts && !active ? 'page' : undefined}
      >
        {t('products.category.all')}
      </Link>
      {(categories ?? []).map((category) => (
        <Link
          key={category.slug}
          to="/products"
          search={{ category: category.slug }}
          className={cn(ITEM, active === category.slug && ACTIVE)}
          aria-current={active === category.slug ? 'page' : undefined}
        >
          {category.name}
        </Link>
      ))}
    </nav>
  )
}
