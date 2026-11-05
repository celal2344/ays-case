import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { useCategoryGroups } from '@/features/products/hooks/use-category-groups'

import { categoryIcon, GROUP_ICONS } from './nav-icons'
import { useActiveCategory } from './use-active-category'

const LINK =
  'flex items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-accent aria-[current=page]:bg-accent aria-[current=page]:font-medium'

/** The same groups as the desktop mega-menu, as an accordion for the phone/tablet menu sheet. */
export function CategoryAccordion({ onNavigate }: { onNavigate: () => void }) {
  const { t } = useTranslation()
  const groups = useCategoryGroups()
  const active = useActiveCategory()
  if (groups.length === 0) return null

  return (
    <nav aria-label={t('nav.categories')} className="px-4">
      <p className="mt-3 px-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {t('nav.categories')}
      </p>
      <Accordion>
        {groups.map((group) => {
          const name = t(`nav.groups.${group.id}`)
          const GroupIcon = GROUP_ICONS[group.id]
          return (
            <AccordionItem key={group.id} value={group.id}>
              <AccordionTrigger>
                <span className="flex items-center gap-3">
                  <GroupIcon className="size-[18px] text-muted-foreground" aria-hidden="true" />
                  {name}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <ul>
                  {group.categories.map((category) => {
                    const Icon = categoryIcon(category.slug)
                    return (
                      <li key={category.slug}>
                        <Link
                          to="/products"
                          search={{ category: category.slug }}
                          onClick={onNavigate}
                          className={LINK}
                          aria-current={active.category === category.slug ? 'page' : undefined}
                        >
                          <span className="flex items-center gap-3">
                            <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                            {category.name}
                          </span>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {category.count}
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                  <li>
                    <Link
                      to="/products"
                      search={{ group: group.id }}
                      onClick={onNavigate}
                      className={`${LINK} font-medium text-brand-text`}
                    >
                      {t('nav.viewAllIn', { group: name })} →
                    </Link>
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    </nav>
  )
}
