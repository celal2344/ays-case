import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { useCategoryGroups } from '@/features/products/hooks/use-category-groups'

const HEADING = 'text-[13px] font-bold tracking-[0.06em] text-muted-foreground uppercase'
const LINK = 'text-sm text-brand-text hover:underline'

export function SiteFooter() {
  const { t } = useTranslation()
  const groups = useCategoryGroups().slice(0, 4)
  return (
    <footer className="mt-[72px] border-t bg-card">
      <div className="page-container flex flex-wrap gap-12 py-12">
        <div className="flex flex-[2_1_280px] flex-col gap-3">
          <span className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="flex size-8 items-center justify-center rounded-[9px] bg-brand font-extrabold text-white"
            >
              a
            </span>
            <strong className="text-lg">{t('app.name')}</strong>
          </span>
          <p className="m-0 max-w-[340px] text-sm text-muted-foreground">{t('footer.about')}</p>
        </div>
        <nav
          aria-label={`${t('footer.label')}: ${t('footer.categories')}`}
          className="flex flex-[1_1_160px] flex-col gap-2"
        >
          <strong className={HEADING}>{t('footer.categories')}</strong>
          {groups.map((group) => (
            <Link key={group.id} to="/products" search={{ group: group.id }} className={LINK}>
              {t(`nav.groups.${group.id}`)}
            </Link>
          ))}
        </nav>
        <nav
          aria-label={`${t('footer.label')}: ${t('footer.account')}`}
          className="flex flex-[1_1_160px] flex-col gap-2"
        >
          <strong className={HEADING}>{t('footer.account')}</strong>
          <Link to="/orders" className={LINK}>
            {t('nav.myOrders')}
          </Link>
          <Link to="/favorites" className={LINK}>
            {t('favorites.title')}
          </Link>
          <Link to="/cart" className={LINK}>
            {t('footer.cart')}
          </Link>
        </nav>
        <nav
          aria-label={`${t('footer.label')}: ${t('footer.project')}`}
          className="flex flex-[1_1_160px] flex-col gap-2"
        >
          <strong className={HEADING}>{t('footer.project')}</strong>
          <a
            href="https://github.com/celal2344/ays-case"
            target="_blank"
            rel="noreferrer"
            className={LINK}
          >
            {t('footer.github')}
          </a>
          <a href="/api/docs" className={LINK}>
            {t('footer.api')}
          </a>
        </nav>
      </div>
      <div className="border-t">
        <div className="page-container py-4 text-[13px] text-muted-foreground">
          {t('footer.copyright')}
        </div>
      </div>
    </footer>
  )
}
