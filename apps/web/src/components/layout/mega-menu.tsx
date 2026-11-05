import { salePriceCents } from '@ays/validators'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Star } from 'lucide-react'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { Money } from '@/components/money'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu'
import { featuredOf, groupOf, type CategoryGroup } from '@/features/products/category-groups'
import { useCatalog } from '@/features/products/hooks/use-catalog'
import { useCategoryGroups } from '@/features/products/hooks/use-category-groups'
import { ProductImage } from '@/features/products/components/product-image'
import { selectLanguage, usePreferencesStore } from '@/preferences/store'
import { cn } from '@/lib/utils'

import { categoryIcon, GROUP_ICONS } from './nav-icons'
import { useActiveCategory } from './use-active-category'

const LABEL = 'text-[13px] font-bold tracking-[0.06em] text-muted-foreground uppercase'

function Featured({ group, name }: { group: CategoryGroup; name: string }) {
  const { t } = useTranslation()
  const language = usePreferencesStore(selectLanguage)
  const { products } = useCatalog()
  const featured = products ? featuredOf(group.id, products) : []
  if (featured.length === 0) return null
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <span className={LABEL}>{t('nav.featured')}</span>
      <ul className="grid grid-cols-3 gap-3">
        {featured.map(({ product, reason }) => (
          <li key={product.id}>
            <NavigationMenuLink
              closeOnClick
              render={<Link to="/products/$productId" params={{ productId: String(product.id) }} />}
              className="h-full flex-col items-stretch gap-1.5 rounded-2xl border border-white/95 bg-white/80 p-3 dark:border-white/10 dark:bg-white/5"
            >
              <ProductImage
                src={product.thumbnail}
                alt=""
                className="aspect-auto h-[110px] w-full bg-transparent [&_img]:object-contain"
              />
              <span className="min-h-[34px] text-[13px] leading-[1.3] font-semibold">
                {product.title}
              </span>
              <span className="flex flex-wrap items-center gap-1.5">
                <strong className="text-sm text-brand-text">
                  <Money cents={salePriceCents(product)} />
                </strong>
                {reason === 'rating' && product.rating !== null ? (
                  <span className="inline-flex items-center gap-0.5 rounded-md bg-success px-1.5 py-px text-[11px] font-bold text-success-foreground">
                    {product.rating.toLocaleString(language, { minimumFractionDigits: 1 })}
                    <Star className="size-2.5 fill-current" aria-hidden="true" />
                  </span>
                ) : (
                  <span className="rounded-md bg-primary px-1.5 py-px text-[11px] font-bold text-primary-foreground">
                    {t('products.discount', { percent: Math.round(product.discountPercentage) })}
                  </span>
                )}
              </span>
            </NavigationMenuLink>
          </li>
        ))}
      </ul>
      <span className="sr-only">{name}</span>
    </div>
  )
}

/**
 * Desktop category navigation (disclosure pattern): every group is a button with `aria-expanded`
 * that opens a panel of plain links, and the panel closes on Escape or an outside click. Built on
 * base-ui's NavigationMenu (hover with intent, click, keyboard and touch all come from it).
 */
export function MegaMenu() {
  const { t } = useTranslation()
  const groups = useCategoryGroups()
  const active = useActiveCategory()
  const rootRef = useRef<HTMLElement>(null)
  if (groups.length === 0) return null

  return (
    <NavigationMenu
      ref={rootRef}
      anchor={rootRef}
      aria-label={t('nav.categories')}
      className="max-w-none justify-start"
    >
      <NavigationMenuList className="h-[52px] flex-wrap justify-start gap-2">
        {groups.map((group) => {
          const groupActive =
            active.group === group.id ||
            (active.category !== undefined && groupOf(active.category) === group.id)
          const name = t(`nav.groups.${group.id}`)
          const GroupIcon = GROUP_ICONS[group.id]
          return (
            <NavigationMenuItem key={group.id} value={group.id}>
              <NavigationMenuTrigger
                className={cn(
                  'relative h-10 gap-2 rounded-[10px] bg-transparent px-3.5 text-[15px] font-medium text-stone-800 after:absolute after:inset-x-3.5 after:-bottom-1.5 after:h-[3px] after:origin-left after:scale-x-0 after:rounded-full after:bg-brand after:transition-transform after:duration-(--motion-base) after:ease-(--ease-out) dark:text-stone-200',
                  'data-popup-open:bg-orange-100/85 data-popup-open:font-semibold data-popup-open:text-primary data-popup-open:after:scale-x-100 dark:data-popup-open:bg-orange-500/15 dark:data-popup-open:text-orange-300',
                  groupActive &&
                    'font-semibold text-primary after:scale-x-100 dark:text-orange-300',
                )}
              >
                <GroupIcon className="size-[18px]" aria-hidden="true" />
                {name}
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <div className="grid w-[min(60rem,calc(100vw-2rem))] gap-8 p-7 lg:grid-cols-2">
                  <div className="flex min-w-0 flex-col gap-4">
                    <span className={LABEL}>{name}</span>
                    <ul className="grid grid-cols-2 gap-2">
                      {group.categories.map((category) => {
                        const Icon = categoryIcon(category.slug)
                        return (
                          <li key={category.slug}>
                            <NavigationMenuLink
                              closeOnClick
                              active={active.category === category.slug}
                              render={<Link to="/products" search={{ category: category.slug }} />}
                              className="gap-3 rounded-[14px] p-3 hover:bg-white/70 dark:hover:bg-white/10 data-active:bg-white/70 dark:data-active:bg-white/10"
                            >
                              <span
                                aria-hidden="true"
                                className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-primary dark:bg-orange-500/15 dark:text-orange-300"
                              >
                                <Icon className="size-5" />
                              </span>
                              <span className="flex min-w-0 flex-col">
                                <span className="truncate font-semibold">{category.name}</span>
                                <span className="text-[13px] text-muted-foreground">
                                  {t('nav.productCount', { count: category.count })}
                                </span>
                              </span>
                            </NavigationMenuLink>
                          </li>
                        )
                      })}
                    </ul>
                    <NavigationMenuLink
                      closeOnClick
                      active={active.group === group.id && !active.category}
                      className="mt-auto w-fit gap-1.5 rounded-lg px-0 font-semibold text-brand-text hover:bg-transparent"
                      render={<Link to="/products" search={{ group: group.id }} />}
                    >
                      {t('nav.viewAllCount', { group: name, count: group.count })}
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </NavigationMenuLink>
                  </div>
                  <Featured group={group} name={name} />
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>
          )
        })}
      </NavigationMenuList>
    </NavigationMenu>
  )
}
