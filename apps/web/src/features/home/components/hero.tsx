import { salePriceCents } from '@ays/validators'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Money } from '@/components/money'
import { hasDiscount } from '@/features/products/pricing'
import type { Product } from '@/features/products/schemas'
import { cn } from '@/lib/utils'
import { selectLanguage, usePreferencesStore } from '@/preferences/store'

import { catalogStats } from '../selectors'

/** Slot styles: position and tilt on desktop (a big centre card and four around it). */
const SLOTS = [
  {
    link: 'lg:top-1/2 lg:left-1/2 lg:w-[260px] lg:-translate-x-1/2 lg:-translate-y-[54%] lg:-rotate-2',
    card: 'gap-2 rounded-3xl p-[18px]',
    image: 'h-[200px]',
  },
  {
    link: 'lg:top-[4%] lg:left-[2%] lg:w-[180px] lg:-rotate-[7deg]',
    card: 'rounded-[20px] p-3.5',
    image: 'h-[120px]',
  },
  {
    link: 'lg:top-0 lg:right-[2%] lg:w-[190px] lg:rotate-6',
    card: 'rounded-[20px] p-3.5',
    image: 'h-[130px]',
  },
  {
    link: 'lg:right-[6%] lg:bottom-0 lg:w-[180px] lg:-rotate-4',
    card: 'rounded-[20px] p-3.5',
    image: 'h-[120px]',
  },
  {
    link: 'lg:bottom-[4%] lg:left-[6%] lg:w-[170px] lg:rotate-5',
    card: 'rounded-[20px] p-3.5',
    image: 'h-[110px]',
  },
] as const

function HeroCard({ product, slot }: { product: Product; slot: number }) {
  const { t } = useTranslation()
  const language = usePreferencesStore(selectLanguage)
  const style = SLOTS[slot] ?? SLOTS[1]
  const centre = slot === 0
  return (
    <Link
      to="/products/$productId"
      params={{ productId: String(product.id) }}
      className={cn(
        'w-[72%] max-w-[260px] shrink-0 snap-center lg:absolute lg:max-w-none',
        style.link,
      )}
    >
      <div
        className={cn(
          'glass hero-bob flex flex-col gap-1.5 text-foreground shadow-[0_18px_36px_-18px_rgba(124,45,18,0.35)]',
          style.card,
        )}
        style={{ animationDelay: `${slot * -1.2}s` }}
      >
        <img
          src={product.thumbnail ?? ''}
          alt=""
          width={200}
          height={200}
          loading="eager"
          fetchPriority="high"
          className={cn('w-full object-contain', style.image)}
        />
        {centre && product.brand ? (
          <span className="text-xs text-muted-foreground">{product.brand.name}</span>
        ) : null}
        <span className={cn('font-semibold', !centre && 'text-sm')}>{product.title}</span>
        <span className="flex items-center gap-1.5">
          <strong className={cn('text-brand-text', centre && 'text-xl')}>
            <Money cents={salePriceCents(product)} />
          </strong>
          {centre && hasDiscount(product) ? (
            <>
              <s className="text-[13px] text-muted-foreground">
                <Money cents={product.priceCents} />
              </s>
              <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                {t('products.discount', { percent: Math.round(product.discountPercentage) })}
              </span>
            </>
          ) : null}
          {slot === 3 && product.rating !== null ? (
            <span className="inline-flex items-center gap-0.5 rounded-md bg-success px-1.5 py-px text-xs font-bold text-success-foreground">
              {product.rating.toLocaleString(language, { minimumFractionDigits: 1 })}
              <Star className="size-3 fill-current" aria-hidden="true" />
            </span>
          ) : null}
        </span>
      </div>
    </Link>
  )
}

export function Hero({ products, hero }: { products: Product[]; hero: Product[] }) {
  const { t } = useTranslation()
  const stats = catalogStats(products)
  return (
    <section aria-label={t('home.featured')} className="soft-bg relative overflow-hidden">
      <div className="page-container flex flex-wrap items-center gap-12 pt-14 pb-16 lg:pt-[72px] lg:pb-20">
        <div className="flex min-w-0 flex-[1_1_460px] flex-col gap-6">
          <span className="glass-flat inline-flex items-center gap-2 self-start rounded-full px-3.5 py-2 text-[13px] font-semibold text-[#7c2d12] dark:text-orange-200">
            <span aria-hidden="true" className="size-2 rounded-full bg-brand" />
            {t('home.pill', stats)}
          </span>
          <h1 className="m-0 text-[clamp(40px,5vw,68px)] leading-[1.04] font-extrabold tracking-[-0.035em]">
            {t('home.heroTitle1')}
            <br />
            {t('home.heroTitle2')}
          </h1>
          <p className="m-0 max-w-[520px] text-lg text-stone-600 dark:text-stone-300">
            {t('home.heroText')}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/products"
              className="inline-flex h-[52px] items-center gap-2.5 rounded-[14px] bg-primary px-6 text-base font-semibold text-primary-foreground shadow-[0_10px_24px_-10px_rgba(194,65,12,0.7)] transition-colors hover:bg-[#9a3412]"
            >
              {t('home.shop')}
              <ArrowRight className="size-[18px]" aria-hidden="true" />
            </Link>
            <Link
              to="/products"
              search={{ sort: 'discount', order: 'desc' }}
              className="glass-flat inline-flex h-[52px] items-center rounded-[14px] px-6 text-base font-semibold text-foreground"
            >
              {t('home.deals')}
            </Link>
          </div>
        </div>
        {hero.length > 0 ? (
          <div className="relative min-w-0 flex-[1_1_520px] lg:h-[500px]">
            <div
              aria-hidden="true"
              className="absolute top-1/2 left-1/2 hidden size-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/50 blur-[2px] lg:block dark:bg-white/5"
            />
            <div className="flex snap-x gap-4 overflow-x-auto pb-2 lg:contents">
              {hero.map((product, index) => (
                <HeroCard key={product.id} product={product} slot={index} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
