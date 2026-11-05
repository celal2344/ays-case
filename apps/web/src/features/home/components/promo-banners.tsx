import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import type { GroupId } from '@/features/products/category-groups'

export interface Banner {
  group: GroupId
  brands: string[]
  cutouts: string[]
}

function Cutouts({ cutouts, big, small }: { cutouts: string[]; big: string; small: string }) {
  const [a, b] = cutouts
  return (
    <>
      {a ? <img src={a} alt="" width={220} height={220} loading="lazy" className={big} /> : null}
      {b ? <img src={b} alt="" width={120} height={120} loading="lazy" className={small} /> : null}
    </>
  )
}

export function PromoBanners({ beauty, electronics }: { beauty?: Banner; electronics?: Banner }) {
  const { t } = useTranslation()
  if (!beauty && !electronics) return null
  return (
    <section
      aria-label={t('home.banners.label')}
      className="page-container flex flex-wrap gap-4 pt-12"
    >
      {beauty ? (
        <Link
          to="/products"
          search={{ group: beauty.group }}
          className="relative flex min-h-60 min-w-0 flex-[1_1_420px] flex-col gap-2.5 overflow-hidden rounded-[26px] bg-[radial-gradient(circle_at_80%_50%,rgba(255,255,255,0.85),transparent_40%),linear-gradient(135deg,#fce7f3,#ffedd5)] p-9 text-stone-900 dark:bg-[#2a1620] dark:bg-[radial-gradient(circle_at_80%_50%,rgba(244,114,182,0.18),transparent_45%)] dark:text-stone-50"
        >
          <span className="text-[13px] font-bold text-[#be185d] dark:text-pink-300">
            {t(`nav.groups.${beauty.group}`)}
          </span>
          <span className="max-w-[300px] text-[32px] leading-[1.1] font-extrabold tracking-[-0.025em]">
            {t('home.banners.beauty', { brands: beauty.brands.join(', ') })}
          </span>
          <span className="mt-auto font-semibold text-brand-text">
            {t('home.banners.discover')}
          </span>
          <Cutouts
            cutouts={beauty.cutouts}
            big="absolute right-6 bottom-3 size-[190px] object-contain max-sm:size-32"
            small="absolute right-[190px] bottom-4 size-[120px] -rotate-[10deg] object-contain max-sm:hidden"
          />
        </Link>
      ) : null}
      {electronics ? (
        <Link
          to="/products"
          search={{ group: electronics.group }}
          className="relative flex min-h-60 min-w-0 flex-[1_1_420px] flex-col gap-2.5 overflow-hidden rounded-[26px] bg-[#1c1917] bg-[radial-gradient(circle_at_78%_60%,rgba(249,115,22,0.4),transparent_45%)] p-9 text-white"
        >
          <span className="text-[13px] font-bold text-orange-300">
            {t(`nav.groups.${electronics.group}`)}
          </span>
          <span className="max-w-[300px] text-[32px] leading-[1.1] font-extrabold tracking-[-0.025em]">
            {t('home.banners.electronics', { brands: electronics.brands.join(', ') })}
          </span>
          <span className="mt-auto font-semibold text-orange-300">
            {t('home.banners.discover')}
          </span>
          <Cutouts
            cutouts={electronics.cutouts}
            big="absolute right-4 bottom-1.5 size-[220px] object-contain max-sm:size-36"
            small="absolute right-[210px] bottom-[18px] size-[110px] object-contain max-sm:hidden"
          />
        </Link>
      ) : null}
    </section>
  )
}
