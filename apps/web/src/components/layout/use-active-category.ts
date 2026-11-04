import { useRouterState } from '@tanstack/react-router'

/** What the URL currently filters by, to highlight the matching group and category. */
export function useActiveCategory() {
  const category = useRouterState({
    select: (s) =>
      s.location.pathname === '/products' && typeof s.location.search.category === 'string'
        ? s.location.search.category
        : undefined,
  })
  const group = useRouterState({
    select: (s) =>
      s.location.pathname === '/products' && typeof s.location.search.group === 'string'
        ? s.location.search.group
        : undefined,
  })
  return { category, group }
}
