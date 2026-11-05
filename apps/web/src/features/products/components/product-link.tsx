import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/**
 * The title link of a clickable card. Its `::after` covers the whole card (see `.card-link`), so the
 * card must carry `card-surface`. Controls inside the card stay separate buttons, not part of a link.
 */
export function ProductLink({
  productId,
  className,
  children,
}: {
  productId: number
  className?: string
  children: ReactNode
}) {
  return (
    <Link
      to="/products/$productId"
      params={{ productId: String(productId) }}
      className={cn('card-link', className)}
    >
      {children}
    </Link>
  )
}
