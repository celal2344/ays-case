import { useTranslation } from 'react-i18next'

import { Skeleton } from '@/components/ui/skeleton'

/** A pale block on the brand panel's gradient (the panel is lighter than a normal page). */
const GHOST = 'bg-white/60 dark:bg-white/10'

/**
 * What login and register show while they load: the same split screen as the real pages, with
 * placeholders where the brand text, the product cards and the form fields will be. `fields` is the
 * number of input rows of the form (2 for login, 4 rows for register).
 */
export function AuthSkeleton({ fields }: { fields: number }) {
  const { t } = useTranslation()
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={t('feedback.loading')}
      className="flex min-h-svh gap-4 bg-background p-4"
    >
      <section className="auth-panel relative hidden min-h-[640px] flex-[1_1_55%] flex-col gap-6 overflow-hidden rounded-[28px] p-10 lg:flex">
        <div className="flex items-center gap-2.5">
          <Skeleton className={`size-9 rounded-[10px] ${GHOST}`} />
          <Skeleton className={`h-5 w-24 ${GHOST}`} />
        </div>
        <div className="mt-6 flex flex-col gap-3">
          <Skeleton className={`h-11 w-[70%] ${GHOST}`} />
          <Skeleton className={`h-11 w-[45%] ${GHOST}`} />
          <Skeleton className={`mt-2 h-4 w-[62%] ${GHOST}`} />
          <Skeleton className={`h-4 w-[40%] ${GHOST}`} />
        </div>
        <div className="relative min-h-[360px] flex-1">
          <Skeleton
            className={`absolute top-[8%] left-[6%] h-[150px] w-[190px] rounded-[22px] ${GHOST}`}
          />
          <Skeleton
            className={`absolute top-[2%] right-[6%] h-[150px] w-[190px] rounded-[22px] ${GHOST}`}
          />
          <Skeleton
            className={`absolute top-[34%] left-1/2 h-[240px] w-[280px] -translate-x-1/2 rounded-3xl ${GHOST}`}
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <Skeleton className={`h-11 w-56 rounded-full ${GHOST}`} />
          <Skeleton className={`h-11 w-36 rounded-full ${GHOST}`} />
        </div>
      </section>
      <div className="flex min-w-0 flex-[1_1_45%] flex-col gap-6 lg:px-2">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-6 w-28" />
          <div className="flex gap-2">
            <Skeleton className="h-11 w-16 rounded-xl" />
            <Skeleton className="size-11 rounded-xl" />
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center py-4">
          <div className="flex w-full max-w-[440px] flex-col gap-6">
            <div className="flex flex-col gap-2.5">
              <Skeleton className="h-9 w-44" />
              <Skeleton className="h-4 w-64" />
            </div>
            {Array.from({ length: fields }, (_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-[50px] w-full rounded-xl" />
              </div>
            ))}
            <Skeleton className="h-[52px] w-full rounded-[14px]" />
            <Skeleton className="mx-auto h-4 w-48" />
          </div>
        </div>
      </div>
    </div>
  )
}
