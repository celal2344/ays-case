import { getRouteApi } from '@tanstack/react-router'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { EmptyState, ErrorState } from '@/components/feedback/feedback'
import { Button } from '@/components/ui/button'
import { selectShopView, usePreferencesStore } from '@/preferences/store'

import { useCategories } from '../hooks/use-categories'
import { useProductList } from '../hooks/use-product-list'
import type { ProductSearch } from '../schemas'
import { updateSearch, withoutFilter } from '../search-state'
import { ActiveFilters } from './active-filters'
import { FilterPanel } from './filter-panel'
import { PaginationBar, RESULTS_ID } from '@/components/pagination-bar'
import { ProductGrid, ProductGridSkeleton } from './product-grid'
import { ProductTable } from './product-table'
import { ProductToolbar } from './product-toolbar'

const route = getRouteApi('/products/')

export function ProductsPage() {
  const { t } = useTranslation()
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const savedView = usePreferencesStore(selectShopView)
  const setShopView = usePreferencesStore((s) => s.setShopView)
  const view = search.view ?? savedView

  const { page, brands, hasProducts, isError, refetch, isPending } = useProductList(search)
  const { categories } = useCategories()

  const change = useCallback(
    (patch: Partial<ProductSearch>) => {
      if (patch.view) setShopView(patch.view)
      // typing in the search box replaces the history entry; everything else is a new entry (back button)
      const typing = Object.keys(patch).length === 1 && 'q' in patch
      void navigate({ search: (prev) => updateSearch(prev, patch), replace: typing })
    },
    [navigate, setShopView],
  )

  const clearFilters = () => change(withoutFilter())

  const categoryList = categories ?? []

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t('products.title')}</h1>
      <div className="grid gap-6 lg:grid-cols-[15rem_1fr]">
        <aside aria-label={t('products.filters.title')} className="hidden lg:block">
          <div className="sticky top-36 rounded-lg border bg-card p-4">
            <FilterPanel
              search={search}
              categories={categoryList}
              brands={brands}
              onChange={change}
            />
          </div>
        </aside>

        <div id={RESULTS_ID} tabIndex={-1} className="min-w-0 scroll-mt-36 space-y-4 outline-none">
          <ProductToolbar
            search={search}
            view={view}
            total={page?.total}
            categories={categoryList}
            brands={brands}
            onChange={change}
          />
          <ActiveFilters search={search} categories={categoryList} onChange={change} />

          {isError ? (
            <ErrorState onRetry={() => void refetch()} />
          ) : isPending || !page ? (
            <ProductGridSkeleton />
          ) : page.total === 0 ? (
            hasProducts ? (
              <EmptyState title={t('products.empty.filtered')}>
                <Button variant="outline" onClick={clearFilters}>
                  {t('products.empty.clear')}
                </Button>
              </EmptyState>
            ) : (
              <EmptyState title={t('products.empty.none')} />
            )
          ) : (
            <>
              {view === 'table' ? (
                <ProductTable products={page.items} />
              ) : (
                <ProductGrid products={page.items} />
              )}
              <PaginationBar page={page} onPageChange={(next) => change({ page: next })} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
