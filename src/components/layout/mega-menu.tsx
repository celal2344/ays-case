import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu'
import { groupOf } from '@/features/products/category-groups'
import { useCategoryGroups } from '@/features/products/hooks/use-category-groups'
import { cn } from '@/lib/utils'

import { useActiveCategory } from './use-active-category'

/**
 * Desktop category navigation: one trigger per group, a panel with its categories in columns and
 * their product counts. Built on base-ui's NavigationMenu (hover, focus, click and touch, arrow keys,
 * Escape and outside click all come from it).
 */
export function MegaMenu() {
  const { t } = useTranslation()
  const groups = useCategoryGroups()
  const active = useActiveCategory()
  if (groups.length === 0) return null

  return (
    <NavigationMenu aria-label={t('nav.categories')} className="max-w-none justify-start">
      <NavigationMenuList className="flex-wrap justify-start">
        {groups.map((group) => {
          const groupActive =
            active.group === group.id ||
            (active.category !== undefined && groupOf(active.category) === group.id)
          const name = t(`nav.groups.${group.id}`)
          return (
            <NavigationMenuItem key={group.id} value={group.id}>
              <NavigationMenuTrigger
                className={cn(
                  'rounded-none border-b-2 border-transparent bg-transparent',
                  groupActive && 'border-brand',
                )}
              >
                {name}
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <div className="w-[min(46rem,90vw)] p-3">
                  <p className="mb-2 px-2 text-sm font-semibold">{name}</p>
                  <ul className="grid gap-x-4 gap-y-0.5 sm:grid-cols-2 xl:grid-cols-3">
                    {group.categories.map((category) => (
                      <li key={category.slug}>
                        <NavigationMenuLink
                          closeOnClick
                          active={active.category === category.slug}
                          render={<Link to="/products" search={{ category: category.slug }} />}
                        >
                          <span className="truncate">{category.name}</span>
                          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                            {category.count}
                          </span>
                        </NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 border-t pt-2">
                    <NavigationMenuLink
                      closeOnClick
                      active={active.group === group.id && !active.category}
                      className="font-medium text-brand-text"
                      render={<Link to="/products" search={{ group: group.id }} />}
                    >
                      {t('nav.viewAllIn', { group: name })} →
                    </NavigationMenuLink>
                  </div>
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>
          )
        })}
      </NavigationMenuList>
    </NavigationMenu>
  )
}
