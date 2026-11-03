import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { SearchBox } from '@/components/search-box'
import { productSearchSchema } from '@/features/products/schemas'
import { normalizeSearch } from '@/features/products/search-state'

/**
 * The shop search in the header. On `/products` it filters the list as you type (keeping the other
 * filters); anywhere else it takes you to the list with just the query applied.
 */
export function HeaderSearch({ className }: { className?: string }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const onProducts = useRouterState({ select: (s) => s.location.pathname === '/products' })
  const rawSearch = useRouterState({ select: (s) => s.location.search })
  const current = onProducts ? productSearchSchema.parse(rawSearch) : {}
  // the callback below must stay stable (the search box debounces on it), so it reads the latest search from a ref
  const latest = useRef(current)
  useEffect(() => {
    latest.current = current
  })

  const commit = useCallback(
    (value: string) => {
      void navigate({
        to: '/products',
        search: normalizeSearch({
          ...latest.current,
          q: value.trim() || undefined,
          page: undefined,
        }),
        replace: onProducts,
      })
    },
    [navigate, onProducts],
  )

  return (
    <SearchBox
      value={current.q ?? ''}
      onCommit={commit}
      placeholder={t('products.search.headerPlaceholder')}
      className={className}
    />
  )
}
