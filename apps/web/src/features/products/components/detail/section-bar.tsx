import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import type { Product } from '../../schemas'
import { CompactBuy } from './compact-buy'

export interface SectionLink {
  id: string
  label: string
}

/**
 * Full-width bar pinned under the header: links to the page sections with an underline on the one in
 * view. From md up it also carries the compact buy block once the main buttons are out of view.
 */
export function SectionBar({
  barRef,
  sections,
  active,
  onSelect,
  product,
  showBuy,
  quantity,
}: {
  barRef: React.RefObject<HTMLDivElement | null>
  sections: SectionLink[]
  active: string
  onSelect: (id: string) => void
  product: Product
  showBuy: boolean
  quantity: number
}) {
  const { t } = useTranslation()
  const navRef = useRef<HTMLElement>(null)

  // keep the active tab visible when the bar scrolls sideways (very narrow screens)
  useEffect(() => {
    const nav = navRef.current
    const current = nav?.querySelector<HTMLElement>('[aria-current="location"]')
    if (!nav || !current || nav.scrollWidth <= nav.clientWidth) return
    nav.scrollLeft = current.offsetLeft - (nav.clientWidth - current.offsetWidth) / 2
  }, [active])

  return (
    <div
      ref={barRef}
      className="sticky top-(--header-h) z-20 flex h-12 items-stretch gap-4 border-b bg-card px-2"
    >
      <nav
        ref={navRef}
        aria-label={t('products.sections')}
        className="flex min-w-0 flex-1 [scrollbar-width:none] overflow-x-auto [&::-webkit-scrollbar]:hidden"
      >
        {sections.map(({ id, label }) => (
          <a
            key={id}
            href={`#${id}`}
            aria-current={active === id ? 'location' : undefined}
            onClick={(event) => {
              event.preventDefault()
              onSelect(id)
            }}
            className={cn(
              'relative flex shrink-0 items-center px-4 text-sm font-medium whitespace-nowrap text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=location]:text-foreground',
              "after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-transparent after:content-[''] aria-[current=location]:after:bg-brand",
            )}
          >
            {label}
          </a>
        ))}
      </nav>
      {showBuy ? (
        <CompactBuy
          product={product}
          quantity={quantity}
          className="hidden max-w-md shrink-0 md:flex lg:max-w-lg"
        />
      ) : null}
    </div>
  )
}
