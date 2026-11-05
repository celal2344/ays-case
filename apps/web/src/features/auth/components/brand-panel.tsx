import { Check, Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Money } from '@/components/money'
import { cn } from '@/lib/utils'
import { selectLanguage, usePreferencesStore } from '@/preferences/store'

import type { PanelCard } from '../panel-images'

/** Where each decorative card sits: the first is the big centre card, the rest float around it. */
const SPOTS = [
  'left-1/2 top-[38%] w-[280px] -translate-x-1/2 -translate-y-1/2 -rotate-2',
  'left-[4%] top-[8%] w-[190px] -rotate-[7deg]',
  'right-[4%] top-[3%] w-[190px] rotate-[6deg]',
  'right-[8%] -bottom-[2%] w-[180px] -rotate-[4deg]',
  'left-[6%] -bottom-[4%] w-[170px] rotate-[5deg]',
] as const

const SIZES = ['h-[190px]', 'h-[120px]', 'h-[120px]', 'h-[110px]', 'h-[110px]'] as const

function Card({ card, index }: { card: PanelCard; index: number }) {
  const language = usePreferencesStore(selectLanguage)
  const big = index === 0
  return (
    <div
      className={cn(
        'glass-flat absolute flex flex-col gap-2 shadow-[0_18px_36px_-18px_rgba(124,45,18,0.35)]',
        big ? 'rounded-3xl p-5' : 'rounded-[22px] p-3.5',
        SPOTS[index],
      )}
    >
      <img
        src={card.image}
        alt=""
        width={200}
        height={200}
        loading="lazy"
        className={cn('w-full object-contain', SIZES[index])}
      />
      {big && card.title ? (
        <>
          <span className="text-[15px] font-semibold">{card.title}</span>
          <span className="flex items-center gap-2">
            {card.priceCents !== undefined ? (
              <strong className="text-brand-text">
                <Money cents={card.priceCents} />
              </strong>
            ) : null}
            {card.oldPriceCents !== undefined ? (
              <s className="text-[13px] text-muted-foreground">
                <Money cents={card.oldPriceCents} />
              </s>
            ) : null}
            {card.rating !== undefined ? (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-success px-1.5 py-px text-xs font-bold text-success-foreground">
                {card.rating.toLocaleString(language, { minimumFractionDigits: 1 })}
                <Star className="size-3 fill-current" aria-hidden="true" />
              </span>
            ) : null}
          </span>
        </>
      ) : null}
    </div>
  )
}

/**
 * The left side of the login and register pages (wide screens only): the logo, a headline, floating
 * product cards and three benefits. The cards are decoration, hidden from assistive technology.
 */
export function BrandPanel({
  title,
  text,
  cards,
}: {
  title: string
  text: string
  cards: PanelCard[]
}) {
  const { t } = useTranslation()
  const benefits = ['cart', 'favorites', 'orders'] as const
  return (
    <section
      aria-label={t('app.name')}
      className="auth-panel relative hidden min-h-[640px] flex-[1_1_55%] flex-col gap-6 overflow-hidden rounded-[28px] p-10 lg:flex"
    >
      <span className="flex items-center gap-2.5 self-start text-foreground">
        <span
          aria-hidden="true"
          className="flex size-9 items-center justify-center rounded-[10px] bg-brand text-lg font-extrabold text-white"
        >
          a
        </span>
        <span className="text-[19px] font-bold tracking-[-0.01em]">{t('app.name')}</span>
      </span>
      <div className="relative z-10 mt-6 flex max-w-[560px] flex-col gap-3">
        <h2 className="m-0 max-w-[460px] text-5xl leading-[1.05] font-extrabold tracking-[-0.035em]">
          {title}
        </h2>
        <p className="m-0 max-w-[520px] text-lg text-stone-600 dark:text-stone-300">{text}</p>
      </div>
      <div aria-hidden="true" className="relative min-h-[420px] flex-1">
        {cards.map((card, index) => (
          <Card key={card.image} card={card} index={index} />
        ))}
      </div>
      <ul className="relative z-10 m-0 flex list-none flex-wrap gap-3 p-0">
        {benefits.map((benefit) => (
          <li
            key={benefit}
            className="glass-flat inline-flex items-center gap-2.5 rounded-full px-[18px] py-3 text-[15px] font-medium"
          >
            <Check className="size-[18px] text-primary" aria-hidden="true" />
            {t(`auth.benefits.${benefit}`)}
          </li>
        ))}
      </ul>
    </section>
  )
}
