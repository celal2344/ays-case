import { Link } from '@tanstack/react-router'
import { X } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { useCatalog } from '@/features/products/hooks/use-catalog'
import { useCategories } from '@/features/products/hooks/use-categories'
import { ProductImage } from '@/features/products/components/product-image'
import { salePriceCents } from '@ays/validators'
import { useRecentlyViewed } from '@/features/recently-viewed/hooks/use-recently-viewed'
import { formatPrice } from '@/lib/format'
import { selectLanguage, usePreferencesStore } from '@/preferences/store'

import { getBestDeals, getSuggestedTags } from '../panel-data'
import { useSearchStore } from '../store'

const MAX_VIEWED = 6
const MAX_TAGS = 10
const MAX_DEALS = 4

const CHIP =
  'inline-flex items-center rounded-full border bg-background px-3 py-1 text-sm outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50'

function Heading({ children, action }: { children: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-sm font-semibold">{children}</h3>
      {action}
    </div>
  )
}

/**
 * What the search popup shows while the box is focused and empty: recently viewed products, the
 * user's recent searches, suggested searches (frequent catalog tags) and the best deals. Everything
 * comes from local history or the merged catalog, and each section is hidden when it has nothing.
 */
export function FocusPanel({
  onSearch,
  onNavigate,
}: {
  /** Runs a search from a chip. `remember` is true for chips that came from the user's own history. */
  onSearch: (query: string, remember: boolean) => void
  onNavigate: () => void
}) {
  const { t } = useTranslation()
  const language = usePreferencesStore(selectLanguage)
  const { products } = useCatalog()
  const { categories } = useCategories()
  const { items: viewed, clear: clearViewed } = useRecentlyViewed()
  const recent = useSearchStore((s) => s.recent)
  const removeRecent = useSearchStore((s) => s.remove)
  const clearRecent = useSearchStore((s) => s.clear)

  const tags = useMemo(
    () => getSuggestedTags(products ?? [], categories ?? [], MAX_TAGS),
    [products, categories],
  )
  const deals = useMemo(() => getBestDeals(products ?? [], MAX_DEALS), [products])
  const shownViewed = viewed.slice(0, MAX_VIEWED)

  return (
    <div className="space-y-4 p-3">
      {shownViewed.length > 0 ? (
        <section className="space-y-2">
          <Heading
            action={
              <Button variant="link" size="sm" onClick={clearViewed}>
                {t('recentlyViewed.clear')}
              </Button>
            }
          >
            {t('recentlyViewed.title')}
          </Heading>
          <ul className="flex gap-2 overflow-x-auto pb-1">
            {shownViewed.map((product) => (
              <li key={product.id} className="shrink-0">
                <Link
                  to="/products/$productId"
                  params={{ productId: String(product.id) }}
                  onClick={onNavigate}
                  aria-label={product.title}
                  title={product.title}
                  className="block overflow-hidden rounded-md border outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <ProductImage src={product.thumbnail} alt="" className="size-14" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {recent.length > 0 ? (
        <section className="space-y-2">
          <Heading
            action={
              <Button variant="link" size="sm" onClick={clearRecent}>
                {t('search.clearRecent')}
              </Button>
            }
          >
            {t('search.recent')}
          </Heading>
          <ul className="flex flex-wrap gap-2">
            {recent.map((query) => (
              <li key={query} className="flex items-center rounded-full border bg-background">
                <button
                  type="button"
                  onClick={() => onSearch(query, true)}
                  className="rounded-l-full py-1 pr-1 pl-3 text-sm outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {query}
                </button>
                <button
                  type="button"
                  onClick={() => removeRecent(query)}
                  aria-label={t('search.removeRecent', { text: query })}
                  className="rounded-r-full py-1 pr-2 pl-1 text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {tags.length > 0 ? (
        <section className="space-y-2">
          <Heading>{t('search.suggested')}</Heading>
          <ul className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <li key={tag}>
                <button type="button" onClick={() => onSearch(tag, false)} className={CHIP}>
                  {tag}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {deals.length > 0 ? (
        <section className="space-y-2">
          <Heading>{t('search.deals')}</Heading>
          <ul className="grid gap-2 sm:grid-cols-2">
            {deals.map((product) => (
              <li key={product.id}>
                <Link
                  to="/products/$productId"
                  params={{ productId: String(product.id) }}
                  onClick={onNavigate}
                  className="flex items-center gap-2 rounded-lg border p-2 outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <ProductImage
                    src={product.thumbnail}
                    alt=""
                    className="size-12 shrink-0 rounded-md"
                  />
                  <span className="min-w-0">
                    <span className="line-clamp-2 text-sm leading-5">{product.title}</span>
                    <span className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-brand-text">
                        {formatPrice(salePriceCents(product) / 100, language)}
                      </span>
                      <span className="rounded bg-brand-soft px-1 text-xs font-medium text-brand-text">
                        {t('products.discount', {
                          percent: Math.round(product.discountPercentage),
                        })}
                      </span>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
