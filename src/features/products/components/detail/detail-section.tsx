import type { ReactNode } from 'react'

/** Height of the sticky section bar (h-12); sections stop below the header and this bar. */
export const SECTION_SCROLL_MARGIN = 'scroll-mt-[calc(var(--header-h)+3rem+0.5rem)]'

/** A titled card panel that the section bar links to by id. The heading takes focus after a jump. */
export function DetailSection({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: ReactNode
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className={`${SECTION_SCROLL_MARGIN} space-y-4 rounded-lg border bg-card p-4 md:p-6`}
    >
      <h2 id={`${id}-heading`} tabIndex={-1} className="text-lg font-semibold outline-none">
        {title}
      </h2>
      {children}
    </section>
  )
}
