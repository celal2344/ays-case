import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import type { CategoryTile } from '../selectors'

export function CategoryTiles({ tiles }: { tiles: CategoryTile[] }) {
  const { t } = useTranslation()
  return (
    <section aria-labelledby="home-categories" className="page-container pt-14 pb-2">
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <h2 id="home-categories" className="m-0 text-[26px] font-bold tracking-[-0.02em]">
          {t('home.categories.title')}
        </h2>
        <Link to="/products" className="font-semibold text-brand-text hover:underline">
          {t('home.categories.all')}
        </Link>
      </div>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4 sm:grid-cols-[repeat(auto-fill,minmax(190px,1fr))]">
        {tiles.map((tile) => {
          const [big, small] = tile.images
          return (
            <li key={tile.group}>
              <Link
                to="/products"
                search={{ group: tile.group }}
                style={{ background: `var(--tint-${tile.group})` }}
                className="relative flex h-[210px] flex-col gap-0.5 overflow-hidden rounded-[22px] border border-black/5 p-[18px] text-foreground transition-transform duration-(--motion-base) ease-(--ease-out) hover:-translate-y-0.5 focus-visible:-translate-y-0.5 dark:border-white/10"
              >
                <span className="text-[17px] font-bold">{t(`nav.groups.${tile.group}`)}</span>
                <span className="text-[13px] text-stone-600 dark:text-stone-300">
                  {t('nav.productCount', { count: tile.count })}
                </span>
                {big ? (
                  <img
                    src={big}
                    alt=""
                    width={128}
                    height={128}
                    loading="lazy"
                    className="absolute right-1 bottom-1 size-32 object-contain"
                  />
                ) : null}
                {small ? (
                  <img
                    src={small}
                    alt=""
                    width={84}
                    height={84}
                    loading="lazy"
                    className="absolute bottom-2 left-2.5 size-[84px] -rotate-[8deg] object-contain"
                  />
                ) : null}
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
