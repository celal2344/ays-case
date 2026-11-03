import { Link } from '@tanstack/react-router'
import { AlertTriangle, FileQuestion, Inbox, ShieldAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

function Centered({
  icon,
  title,
  children,
}: {
  icon: ReactNode
  title: string
  children?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-16 text-center" role="status">
      <div className="text-muted-foreground">{icon}</div>
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </div>
  )
}

export function PageSkeleton() {
  const { t } = useTranslation()
  return (
    <div className="space-y-4" aria-busy="true" aria-label={t('feedback.loading')}>
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const { t } = useTranslation()
  return (
    <Centered icon={<AlertTriangle className="size-8" />} title={t('feedback.error.title')}>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      {onRetry ? (
        <Button variant="outline" onClick={onRetry}>
          {t('feedback.error.retry')}
        </Button>
      ) : null}
    </Centered>
  )
}

export function EmptyState({ title, children }: { title?: string; children?: ReactNode }) {
  const { t } = useTranslation()
  return (
    <Centered icon={<Inbox className="size-8" />} title={title ?? t('feedback.empty.title')}>
      {children}
    </Centered>
  )
}

export function NotFound() {
  const { t } = useTranslation()
  return (
    <Centered icon={<FileQuestion className="size-8" />} title={t('feedback.notFound.title')}>
      <p className="text-sm text-muted-foreground">{t('feedback.notFound.body')}</p>
      <Button variant="outline" render={<Link to="/" />}>
        {t('feedback.notFound.back')}
      </Button>
    </Centered>
  )
}

export function Forbidden() {
  const { t } = useTranslation()
  return (
    <Centered icon={<ShieldAlert className="size-8" />} title={t('feedback.forbidden.title')}>
      <p className="text-sm text-muted-foreground">{t('feedback.forbidden.body')}</p>
      <Button variant="outline" render={<Link to="/" />}>
        {t('feedback.forbidden.back')}
      </Button>
    </Centered>
  )
}
